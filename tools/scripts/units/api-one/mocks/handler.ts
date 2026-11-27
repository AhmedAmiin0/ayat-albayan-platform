import ts from 'typescript';
import { narrow } from '../ast.ts';
import type { MockKind } from './mocks.types.ts';

const FIELDS: Record<MockKind, readonly string[]> = {
  read: ['path'],
  write: ['method', 'path', 'body'],
};

const field = (key: string, name: string): string => (key === name ? key : `${key}: ${name}`);

const paramName = (p: ts.ParameterDeclaration): string =>
  p.dotDotDotToken === undefined ? (narrow(p.name, ts.isIdentifier)?.text ?? '') : '';

const asyncOf = (fn: ts.ArrowFunction): string =>
  fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) === true ? 'async ' : '';

function headOf(names: readonly string[], kind: MockKind): string {
  const pattern = names.map((n, i) => field(FIELDS[kind][i] ?? '', n)).join(', ');
  return names.length === 0 ? '()' : `({ ${pattern} })`;
}

/**
 * `(path) => …` → `({ path }) => …`, `(m, p, b) => …` → `({ method: m, path: p, body: b }) => …`:
 * the mock's positional arguments become the fields of the request mockCall saw.
 */
export function handlerText(fn: ts.Node, kind: MockKind): string | undefined {
  const arrow = narrow(fn, ts.isArrowFunction);
  if (arrow === undefined) return undefined;
  const names = arrow.parameters.map(paramName);
  const usable = names.length <= FIELDS[kind].length && !names.includes('');
  return usable ? `${asyncOf(arrow)}${headOf(names, kind)} => ${arrow.body.getText()}` : undefined;
}
