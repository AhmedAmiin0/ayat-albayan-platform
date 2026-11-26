import { posix } from 'node:path';
import type ts from 'typescript';
import type { AdoptInput } from './adopt.types.ts';
import { emitImports, importsOf } from '../../model/imports.ts';
import { readsAny } from '../../model/names.ts';
import { all, no, ok } from '../../model/result.ts';
import { kebabOf } from '../../model/source.ts';
import type { Group } from './adopt.types.ts';
import type { ImportDecl } from '../../model/model.types.ts';
import type { Result } from '../../model/model.types.ts';

/** `useQuoteSend` → `use-quote-send.ts` in `dir`. */
export const fileOfHook = (dir: string, hook: string): string =>
  `${dir}/use-${kebabOf(hook.slice(3))}.ts`;

type Repo = Pick<AdoptInput, 'resolve' | 'specFor'>;

interface At {
  sf: ts.SourceFile;
  from: string;
  to: string;
  repo: Repo;
}

/** The file's imports as `to` must spell them; a relative one that resolves nowhere stops it. */
const movedImports = ({ sf, from, to, repo }: At): Result<ImportDecl[]> =>
  all(importsOf(sf), (d) => {
    if (!d.spec.startsWith('.')) return ok(d);
    const file = repo.resolve(from, d.spec);
    if (file === undefined) return no(`${d.spec} in ${posix.basename(from)} resolves nowhere`);
    return ok({ ...d, spec: repo.specFor(to, file) });
  });

function statementsText(sf: ts.SourceFile, statements: readonly ts.Statement[]): string {
  return statements
    .map((s) => sf.text.slice(s.getFullStart(), s.getEnd()))
    .map((t, i) => (i === 0 ? t.replace(/^\n+/, '') : t.replace(/^\n{3,}/, '\n\n')))
    .join('');
}

function siblingLines(g: Group, at: At & { files: ReadonlyMap<string, string> }): string[] {
  const reads = readsAny(g.statements);
  return [...at.files]
    .filter(([root]) => root !== g.root && reads.has(root))
    .map(([root, file]) => `import { ${root} } from '${at.repo.specFor(at.to, file)}';`);
}

interface Emit extends Omit<At, 'to'> {
  own: string;
  files: ReadonlyMap<string, string>;
}

function fileOf(g: Group, at: Emit): Result<[string, string]> {
  const to = at.files.get(g.root) ?? '';
  const decls = movedImports({ ...at, to });
  if (!decls.ok) return no(decls.why);
  const imports = [
    ...emitImports(decls.value, readsAny(g.statements), { keepSideEffects: g.root === at.own }),
    ...siblingLines(g, { ...at, to }),
  ];
  const head = imports.length === 0 ? '' : `${imports.join('\n')}\n\n`;
  return ok([to, `${head}${statementsText(at.sf, g.statements)}\n`]);
}

/** Each group's new file: its imports re-spelled for the folder, then its statements in order. */
export function hookFiles(at: Emit, groups: readonly Group[]): Result<Record<string, string>> {
  const out = all(groups, (g) => fileOf(g, at));
  return out.ok ? ok(Object.fromEntries(out.value)) : no(out.why);
}
