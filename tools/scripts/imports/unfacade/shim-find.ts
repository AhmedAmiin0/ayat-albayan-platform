// The re-export files of a workspace (a file re-exporting another workspace's names) and every
// reference to them in the repo. Only named imports can be repointed; any other reference (a
// barrel, a namespace or dynamic import) keeps the file, and a mock makes it manual.
import { posix } from 'node:path';
import type { SourceFile } from 'ts-morph';
import { codeFiles } from '../../ci-checks/move-module/files.ts';
import { newProject } from '../../ci-checks/move-module/rewrite.ts';
import { specifierNodes } from '../../ci-checks/move-module/specifiers.ts';
import { targetOf } from './resolve.ts';
import { FACADE, isInlineType, namedOf } from './statement.ts';
import type { Named, ShimName, Shim, ReadCtx, FileRefs } from './types.ts';

const WORKSPACE_SCOPE = '@ab/';
const MOCK_BEFORE = /(?:vi|jest)\.\w*[mM]ock\w*\(\s*['"`]$/;

interface ShimsCtx {
  root: string;
  shims: ReadonlySet<string>;
}

type ShimOrNot = Shim | undefined;

const finalSpec = (n: Named, source: string, owners: ReadonlyMap<string, string>): string =>
  n.spec === FACADE ? (owners.get(source) ?? FACADE) : n.spec;

function entriesOf(n: Named, owners: ReadonlyMap<string, string>): [string, ShimName][] {
  return n.elements.map((e) => [
    e.alias ?? e.name,
    { source: e.name, spec: finalSpec(n, e.name, owners), type: n.typeOnly || isInlineType(e) },
  ]);
}

/** The shim of `sf`, or undefined when it re-exports nothing from another workspace. */
export function shimOf(
  sf: SourceFile,
  path: string,
  owners: ReadonlyMap<string, string>,
): ShimOrNot {
  const decls = sf
    .getExportDeclarations()
    .flatMap((decl) => namedOf(decl) ?? [])
    .filter((n) => n.spec.startsWith(WORKSPACE_SCOPE));
  if (decls.length === 0) return undefined;
  const names = new Map(decls.flatMap((n) => entriesOf(n, owners)));
  return { path, names, decls, statements: sf.getStatements().length };
}

type At = (spec: string) => string | undefined;

function namedImports(sf: SourceFile, at: At): FileRefs['imports'] {
  return sf.getImportDeclarations().flatMap((decl) => {
    const named = namedOf(decl);
    const target = at(decl.getModuleSpecifierValue());
    return named === undefined || target === undefined ? [] : [{ named, target }];
  });
}

const mockedAt = (text: string, start: number): boolean =>
  MOCK_BEFORE.test(text.slice(Math.max(0, start - 80), start));

/** What `sf` (at `path`) imports from, re-exports from, or mocks among the `shims` paths. */
export function refsOf(sf: SourceFile, path: string, ctx: ShimsCtx): FileRefs {
  const at: At = (spec) => targetOf(ctx.root, { from: path, spec }, ctx.shims);
  const imports = namedImports(sf, at);
  const taken = new Set(imports.map((i) => i.named.decl.getModuleSpecifier()?.getStart()));
  const text = sf.getFullText();
  const hits = specifierNodes(sf)
    .filter((s) => !taken.has(s.start - 1))
    .flatMap((s) => {
      const target = at(s.value);
      return target === undefined ? [] : [{ target, mock: mockedAt(text, s.start) }];
    });
  return {
    imports,
    pinned: hits.map((h) => h.target),
    mocked: hits.filter((h) => h.mock).map((h) => h.target),
  };
}

/** The stems a file's specifier must contain to reach `path` (its name, or its folder's). */
export const stemOf = (path: string): string => {
  const base = posix.basename(path).replace(/\.[cm]?[jt]sx?$/, '');
  return base === 'index' ? posix.basename(posix.dirname(path)) : base;
};

/** The references of every code file that may reach one of `shims`. */
export function scanRefs(ctx: ReadCtx, shims: ReadonlyMap<string, Shim>): Map<string, FileRefs> {
  const project = newProject();
  const stems = [...new Set([...shims.keys()].map(stemOf))];
  const known = new Set(shims.keys());
  const out = new Map<string, FileRefs>();
  for (const path of codeFiles(ctx.root).filter((p) =>
    stems.some((s) => ctx.read(p).includes(s)),
  )) {
    const sf = project.createSourceFile(`/${path}`, ctx.read(path), { overwrite: true });
    out.set(path, refsOf(sf, path, { root: ctx.root, shims: known }));
    project.removeSourceFile(sf);
  }
  return out;
}
