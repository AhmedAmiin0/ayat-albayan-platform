// Check 5: the body of Name.tsx (docs/57 §2.12). An optional useTheme(), then either one call to
// its own use<Name> and nothing else, or value consts only; guards; the JSX return.
import ts from 'typescript';
import { arrowFailures } from './arrows.mjs';
import { calleeName, findDerivation, findHookCall, hasFunction, hasJsx } from './find.mjs';

const isGuard = (s) =>
  ts.isIfStatement(s) &&
  s.elseStatement === undefined &&
  (ts.isReturnStatement(s.thenStatement) ||
    (ts.isBlock(s.thenStatement) &&
      s.thenStatement.statements.length === 1 &&
      ts.isReturnStatement(s.thenStatement.statements[0])));

/** The body as declarations, guards, the final return and the statements out of place. */
export function partsOf(fn) {
  if (!ts.isBlock(fn.body)) return { decls: [], guards: [], ret: fn.body, stray: [] };
  const statements = [...fn.body.statements];
  const last = statements.at(-1);
  const ret = last !== undefined && ts.isReturnStatement(last) ? last.expression : undefined;
  const middle = ret === undefined ? statements : statements.slice(0, -1);
  const cut = middle.findIndex((s) => ts.isIfStatement(s));
  const [decls, guards] = cut < 0 ? [middle, []] : [middle.slice(0, cut), middle.slice(cut)];
  const stray = [
    ...decls.filter((s) => !ts.isVariableStatement(s)),
    ...guards.filter((s) => !isGuard(s)),
  ];
  return {
    decls: decls.filter(ts.isVariableStatement),
    guards: guards.filter(isGuard),
    ret,
    stray,
  };
}

const initCall = (d) =>
  d.initializer !== undefined && ts.isCallExpression(d.initializer)
    ? calleeName(d.initializer)
    : '';

const isValue = (d) =>
  d.initializer === undefined ||
  [hasFunction, hasJsx, findHookCall, findDerivation].every((has) => !has(d.initializer));

function declKind(d, own) {
  const call = initCall(d);
  if (call === 'useTheme' || call === own) return call === own ? 'own' : 'theme';
  return isValue(d) ? 'value' : 'logic';
}

function declFailures(decls, name, sf) {
  const own = `use${name}`;
  const all = decls.flatMap((s) => [...s.declarationList.declarations]);
  const kinds = all.map((d) => declKind(d, own));
  const owns = kinds.filter((k) => k === 'own').length;
  const extra =
    owns > 0
      ? kinds.filter((k) => k === 'value' || k === 'logic')
      : kinds.filter((k) => k === 'logic');
  const bad = all.filter((_, i) => extra.includes(kinds[i]));
  const first = bad[0];
  return [
    ...(owns > 1 ? [`${own} is called more than once`] : []),
    ...(first === undefined
      ? []
      : [`move this statement into ${own}: ${first.getText(sf).slice(0, 60)}`]),
  ];
}

const VIEW = 'in JSX or a guard';

function viewFailures(nodes, sf) {
  const hooks = nodes.map(findHookCall).filter((n) => n !== undefined);
  const derived = nodes.map(findDerivation).filter((n) => n !== undefined);
  return [
    ...hooks.map((n) => `a hook call ${VIEW}: ${n.getText(sf).slice(0, 40)}`),
    ...derived.map((n) => `an array derivation ${VIEW}: ${n.getText(sf).slice(0, 40)}`),
    ...nodes.flatMap((n) => arrowFailures(n, sf)),
  ];
}

/** `useName(props);`: its own hook with nothing the view reads. */
const isOwnCall = (s, own) =>
  ts.isExpressionStatement(s) &&
  ts.isCallExpression(s.expression) &&
  calleeName(s.expression) === own;

/** Check 5's reasons for one component; `c` comes from componentsOf. */
export function bodyFailures(c, sf) {
  if (c.wrapped) return ['wrapped in a call (forwardRef or memo): hand work'];
  const { decls, guards, ret, stray: all } = partsOf(c.fn);
  const view = [...guards, ...(ret === undefined ? [] : [ret])];
  const stray = all.filter((s) => !isOwnCall(s, `use${c.name}`));
  return [
    ...(ret === undefined ? ['no final return'] : []),
    ...stray.map((s) => `a statement out of place: ${s.getText(sf).slice(0, 60)}`),
    ...declFailures(decls, c.name, sf),
    ...viewFailures(view, sf),
  ];
}
