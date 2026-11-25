import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import ts from 'typescript';
import { loadAliases, resolveSpec } from '../../../ci-checks/move-module/resolve.ts';
import { groupBy } from '../model/group.ts';
import { parseFile } from '../model/source.ts';

/** What the steps learn from the repo: tests that render a component, path importers. */
export interface RepoContext {
  read: (path: string) => string;
  tested: (name: string, ws: string) => boolean;
  importers: (path: string) => { file: string; names: string[] }[];
}

const CODE = /^(?:apps|packages)\/[^/]+\/src\/.*\.(?:tsx?|mts)$/;
const TEST = /\.(?:test|spec)\.tsx?$/;

const namesOf = (sf: ts.SourceFile, spec: string): string[] =>
  sf.statements
    .filter(
      (s): s is ts.ImportDeclaration | ts.ExportDeclaration =>
        ts.isImportDeclaration(s) || ts.isExportDeclaration(s),
    )
    .filter(
      (s) =>
        s.moduleSpecifier !== undefined &&
        ts.isStringLiteral(s.moduleSpecifier) &&
        s.moduleSpecifier.text === spec,
    )
    .flatMap((s) => {
      const clause = ts.isImportDeclaration(s) ? s.importClause?.namedBindings : s.exportClause;
      return clause !== undefined && (ts.isNamedImports(clause) || ts.isNamedExports(clause))
        ? clause.elements.map((e) => (e.propertyName ?? e.name).text)
        : [];
    });

export function repoContext(root: string, paths: readonly string[]): RepoContext {
  const read = (path: string): string => {
    const abs = posix.join(root, path);
    return existsSync(abs) ? readFileSync(abs, 'utf8') : '';
  };
  const tests = groupBy(
    paths.filter((p) => TEST.test(p)),
    (p) => p.split('/').slice(0, 2).join('/'),
  );
  const corpus = new Map([...tests].map(([ws, files]) => [ws, files.map(read).join('\n')]));
  const r = { root, aliases: loadAliases(root), renamed: new Map<string, string>() };
  const edges = paths
    .filter((p) => CODE.test(p))
    .flatMap((from) =>
      ts.preProcessFile(read(from), true, true).importedFiles.flatMap(({ fileName }) => {
        const file = resolveSpec(r, from, fileName)?.file;
        return file === undefined ? [] : [{ from, file, spec: fileName }];
      }),
    );
  const byTarget = groupBy(edges, (e) => e.file);
  return {
    read,
    tested: (name, ws) => new RegExp(`<${name}[\\s/>]`).test(corpus.get(ws) ?? ''),
    importers: (path) =>
      (byTarget.get(path) ?? [])
        .filter((e) => !e.from.startsWith(`${posix.dirname(path)}/`))
        .map((e) => ({ file: e.from, names: namesOf(parseFile(e.from, read(e.from)), e.spec) })),
  };
}
