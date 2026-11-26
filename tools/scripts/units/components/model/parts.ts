import ts from 'typescript';
import type { Parts } from './model.types.ts';

const returnsOnly = (s: ts.Statement): boolean =>
  ts.isReturnStatement(s) ||
  (ts.isBlock(s) && s.statements.length === 1 && s.statements.every(ts.isReturnStatement));

export const isGuard = (s: ts.Statement): s is ts.IfStatement =>
  ts.isIfStatement(s) && s.elseStatement === undefined && returnsOnly(s.thenStatement);

const finalReturn = (all: readonly ts.Statement[]): ts.ReturnStatement | undefined => {
  const last = all.at(-1);
  return last !== undefined && ts.isReturnStatement(last) ? last : undefined;
};

export function partsOf(body: ts.ConciseBody): Parts {
  if (!ts.isBlock(body)) return { setup: [], guards: [], ret: body, stray: undefined };
  const all = [...body.statements];
  const last = finalReturn(all);
  const middle = last === undefined ? all : all.slice(0, -1);
  const cut = middle.findIndex(isGuard);
  const at = cut < 0 ? middle.length : cut;
  const tail = middle.slice(at);
  const stray = tail.find((s) => !isGuard(s));
  return { setup: middle.slice(0, at), guards: tail.filter(isGuard), ret: last?.expression, stray };
}
