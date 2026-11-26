// The AST questions every check asks: which top-level declarations are components, and what a
// node holds (JSX, a function literal, a hook call, an array derivation).
import ts from 'typescript';

const PASCAL = /^[A-Z](?=[A-Za-z0-9]*[a-z])[A-Za-z0-9]*$/;
const HOOK = /^use[A-Z]/;
const DERIVATIONS = new Set([
  'filter',
  'sort',
  'toSorted',
  'reduce',
  'find',
  'some',
  'every',
  'flatMap',
]);

export const isFunctionLike = (node) =>
  ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node);

const isJsx = (node) =>
  ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node);

/** The first node under `node` (itself included) that `test` accepts, or undefined. */
export function findIn(node, test) {
  if (test(node)) return node;
  return ts.forEachChild(node, (child) => findIn(child, test));
}

const NAME_OF = {
  [ts.SyntaxKind.PropertyAccessExpression]: (e) => e.name.text,
  [ts.SyntaxKind.Identifier]: (e) => e.text,
};

export const calleeName = (call) => NAME_OF[call.expression.kind]?.(call.expression) ?? '';

export const isHookCall = (node) => ts.isCallExpression(node) && HOOK.test(calleeName(node));

const isDerivation = (node) =>
  ts.isCallExpression(node) &&
  ts.isPropertyAccessExpression(node.expression) &&
  DERIVATIONS.has(node.expression.name.text);

export const hasJsx = (node) => findIn(node, isJsx) !== undefined;
export const hasFunction = (node) => findIn(node, isFunctionLike) !== undefined;
export const findHookCall = (node) => findIn(node, isHookCall);
export const findDerivation = (node) => findIn(node, isDerivation);

const component = (name, fn, statement) =>
  PASCAL.test(name) && fn.body !== undefined && hasJsx(fn.body) ? [{ name, fn, statement }] : [];

/** The function an initializer holds: itself, or the one a call wraps (`memo(function A…)`). */
function functionOf(init) {
  if (init === undefined) return undefined;
  if (isFunctionLike(init)) return { fn: init, wrapped: false };
  const inner = ts.isCallExpression(init) ? init.arguments.find(isFunctionLike) : undefined;
  return inner === undefined ? undefined : { fn: inner, wrapped: true };
}

function fromVariables(statement) {
  return statement.declarationList.declarations.flatMap((d) => {
    const found = ts.isIdentifier(d.name) ? functionOf(d.initializer) : undefined;
    if (found === undefined) return [];
    return component(d.name.text, found.fn, statement).map((c) => ({
      ...c,
      wrapped: found.wrapped,
    }));
  });
}

const FROM = {
  [ts.SyntaxKind.FunctionDeclaration]: (s) =>
    s.name === undefined ? [] : component(s.name.text, s, s).map((c) => ({ ...c, wrapped: false })),
  [ts.SyntaxKind.VariableStatement]: fromVariables,
};

/** Top-level PascalCase functions or consts whose function returns JSX. */
export const componentsOf = (sf) => sf.statements.flatMap((s) => FROM[s.kind]?.(s) ?? []);
