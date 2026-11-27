import { excludedWhy } from '../../components/cli/discover.ts';
import { rewriteMocks } from '../mocks/mock-file.ts';
import { rewriteSource } from '../source/source-file.ts';
import type { Found } from '../source/source.types.ts';
import type { Planned, Row, RowKind, SourceFile } from './cli.types.ts';

const SCOPE = /^(?:apps\/(?!api\/)[^/]+|packages\/[^/]+)\/src\/.+\.tsx?$/;
const TEST = /\.test\.tsx?$/;
const PAIR = /\b(?:apiFetch|apiSend|publicApiFetch|publicApiSend)\b/;

/** The files the codemod reads: client code in apps (not the api) and packages. */
export const inScope = (path: string): boolean => SCOPE.test(path) && !path.endsWith('.d.ts');

const rowsOf = (path: string, kind: RowKind, found: readonly Found[]): Row[] =>
  found.map((f) => ({ path, kind, ...f }));

function planFile({ path, text }: SourceFile): { rows: Row[]; text: string } {
  const source = rewriteSource(path, text);
  const mocks = TEST.test(path)
    ? rewriteMocks(path, source.text)
    : { text: source.text, found: [] };
  return {
    rows: [...rowsOf(path, 'call', source.found), ...rowsOf(path, 'test', mocks.found)],
    text: mocks.text,
  };
}

function planOrExclude(file: SourceFile, excludes: ReadonlyMap<string, string>) {
  const why = excludedWhy(file.path, excludes);
  if (why === undefined) return planFile(file);
  const row: Row = { path: file.path, line: 0, kind: 'call', result: 'excluded', reason: why };
  return { rows: [row], text: file.text };
}

/** Every file naming the pair: its rows, and its new text when anything was rewritten. */
export function planAll(
  files: readonly SourceFile[],
  excludes: ReadonlyMap<string, string>,
): Planned {
  const named = files.filter((f) => inScope(f.path) && PAIR.test(f.text));
  const done = named.map((file) => ({ file, ...planOrExclude(file, excludes) }));
  return {
    rows: done.flatMap((d) => d.rows),
    files: new Map(done.filter((d) => d.text !== d.file.text).map((d) => [d.file.path, d.text])),
  };
}
