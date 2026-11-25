import ts from 'typescript';

/** A component body as `S` (setup), `G` (guards) and `R` (the final return's expression). */
export interface Parts {
  setup: ts.Statement[];
  guards: ts.IfStatement[];
  ret: ts.Expression | undefined;
  /** A statement after the first guard that is not a guard («narrowing after guard»). */
  stray: ts.Statement | undefined;
}

const returnsOnly = (s: ts.Statement): boolean =>
  ts.isReturnStatement(s) ||
  (ts.isBlock(s) && s.statements.length === 1 && s.statements.every(ts.isReturnStatement));

export const isGuard = (s: ts.Statement): s is ts.IfStatement =>
  ts.isIfStatement(s) && s.elseStatement === undefined && returnsOnly(s.thenStatement);

export function partsOf(body: ts.ConciseBody): Parts {
  if (!ts.isBlock(body)) return { setup: [], guards: [], ret: body, stray: undefined };
  const all = [...body.statements];
  const last = all.at(-1);
  const ret = last !== undefined && ts.isReturnStatement(last) ? last.expression : undefined;
  const middle = ret === undefined ? all : all.slice(0, -1);
  const cut = middle.findIndex(isGuard);
  const setup = cut < 0 ? middle : middle.slice(0, cut);
  const tail = cut < 0 ? [] : middle.slice(cut);
  return { setup, guards: tail.filter(isGuard), ret, stray: tail.find((s) => !isGuard(s)) };
}
