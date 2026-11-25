// The JSX arrow rules of docs/57 §2.12: an arrow returning JSX is a render prop; any other arrow
// is one call, `void call()` or an accessor, with no `?:`, `&&`, `||`, `??` or nested function.
import ts from 'typescript';
import { findIn, isFunctionLike } from './find.mjs';

const LOGIC = new Set([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
]);

const unwrap = (e) => (ts.isParenthesizedExpression(e) ? unwrap(e.expression) : e);

const isEmpty = (e) =>
  e.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(e) && e.text === 'undefined');

const JSXISH = {
  [ts.SyntaxKind.JsxElement]: () => true,
  [ts.SyntaxKind.JsxSelfClosingElement]: () => true,
  [ts.SyntaxKind.JsxFragment]: () => true,
  [ts.SyntaxKind.ConditionalExpression]: (e) => branchesJsx([e.whenTrue, e.whenFalse]),
  [ts.SyntaxKind.BinaryExpression]: (e) => LOGIC.has(e.operatorToken.kind) && isJsxish(e.right),
};

function branchesJsx(branches) {
  const parts = branches.map(unwrap);
  return parts.some(isJsxish) && parts.every((p) => isJsxish(p) || isEmpty(p));
}

/** JSX, or JSX behind `?:` / `&&` (the other branch JSX or null). */
export const isJsxish = (node) => JSXISH[unwrap(node).kind]?.(unwrap(node)) ?? false;

const onlyReturn = (block) =>
  block.statements.length === 1 && ts.isReturnStatement(block.statements[0])
    ? block.statements[0].expression
    : undefined;

const resultOf = (fn) => (ts.isBlock(fn.body) ? onlyReturn(fn.body) : fn.body);

const rendersJsx = (fn) => {
  const result = resultOf(fn);
  return result !== undefined && isJsxish(result);
};

const isAccessor = (e) =>
  ts.isIdentifier(e) ||
  e.kind === ts.SyntaxKind.ThisKeyword ||
  ((ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) &&
    isAccessor(e.expression));

const isLogic = (n) =>
  isFunctionLike(n) ||
  ts.isConditionalExpression(n) ||
  (ts.isBinaryExpression(n) && LOGIC.has(n.operatorToken.kind));

function isOneStep(fn) {
  if (ts.isBlock(fn.body)) return false;
  const body = unwrap(fn.body);
  const step = ts.isVoidExpression(body) ? unwrap(body.expression) : body;
  const shaped = isAccessor(step) || (ts.isCallExpression(step) && isAccessor(step.expression));
  return shaped && findIn(step, isLogic) === undefined;
}

/** One reason per arrow under `node` that breaks the rules. */
export function arrowFailures(node, sf) {
  if (isFunctionLike(node) && !rendersJsx(node)) {
    return isOneStep(node) ? [] : [`an inline arrow with logic: ${node.getText(sf).slice(0, 60)}`];
  }
  return node.getChildren(sf).flatMap((child) => arrowFailures(child, sf));
}
