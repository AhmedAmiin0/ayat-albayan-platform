// Finds `const { data, error } = await q; if (error) throw dbError(error);` pairs and the helper
// that keeps their behaviour: `.maybeSingle()` → maybe, `.single()` → one, a `.from().select()`
// list → rows, `{ error }` alone → done. Anything else is left for the pgError fallback.
import { SyntaxKind } from 'ts-morph';

const ENDINGS = { maybeSingle: 'maybe', single: 'one' };

const lastCallName = (call) =>
  call.getExpression().getKind() === SyntaxKind.PropertyAccessExpression
    ? call.getExpression().getName()
    : null;

/** Calls that only retype a result, so the call before them sets its shape. */
const TYPE_ONLY = new Set(['overrideTypes', 'returns']);

const receiverCall = (call) => {
  const callee = call.getExpression();
  const target =
    callee.getKind() === SyntaxKind.PropertyAccessExpression ? callee.getExpression() : null;
  return target?.getKind() === SyntaxKind.CallExpression ? target : null;
};

function endingCall(call) {
  const before = TYPE_ONLY.has(lastCallName(call)) ? receiverCall(call) : null;
  return before === null ? call : endingCall(before);
}

const callsIn = (expr) =>
  [expr, ...expr.getDescendantsOfKind(SyntaxKind.CallExpression)]
    .filter((n) => n.getKind() === SyntaxKind.CallExpression)
    .map(lastCallName);

/** The helper for a read whose data is kept, or null when its shape is not provable. */
export function readHelper(awaited) {
  if (awaited.getKind() !== SyntaxKind.CallExpression) return null;
  const last = lastCallName(endingCall(awaited));
  if (Object.hasOwn(ENDINGS, last)) return ENDINGS[last];
  const names = callsIn(awaited);
  const list = names.includes('from') && names.includes('select') && !names.includes('rpc');
  return list && !/\bhead\s*:/.test(awaited.getText()) ? 'rows' : null;
}

const bindingName = (el) => el.getPropertyNameNode()?.getText() ?? el.getName();

/** `{ error }` or `{ data[: name], error }` with nothing else: the kept data name or ''. */
function plainBinding(decl) {
  const pattern = decl.getNameNode();
  if (pattern.getKind() !== SyntaxKind.ObjectBindingPattern) return null;
  const els = pattern.getElements();
  const plain = els.every((el) => !el.getInitializer() && !el.getDotDotDotToken());
  const keys = els.map(bindingName).sort().join(',');
  const errorEl = els.find((el) => bindingName(el) === 'error');
  if (!plain || errorEl?.getName() !== 'error') return null;
  const dataEl = els.find((el) => bindingName(el) === 'data');
  const ok = { error: '', 'data,error': dataEl?.getNameNode().getText() };
  return Object.hasOwn(ok, keys) ? ok[keys] : null;
}

const isErrorRef = (id) => {
  const parent = id.getParent();
  const asName =
    parent.getKind() === SyntaxKind.PropertyAccessExpression && parent.getNameNode() === id;
  const asKey = parent.getKind() === SyntaxKind.PropertyAssignment && parent.getNameNode() === id;
  return !asName && !asKey && id.getText() === 'error';
};

const onlyConst = (statement) => {
  if (statement?.getKind() !== SyntaxKind.VariableStatement) return undefined;
  const list = statement.getDeclarationList();
  const decls = list.getDeclarations();
  return decls.length === 1 && list.getText().startsWith('const') ? decls[0] : undefined;
};

const awaitsUntyped = (decl) =>
  decl.getInitializer()?.getKind() === SyntaxKind.AwaitExpression && !decl.getTypeNode();

/** The single untyped `const x = await …` declaration of a statement, or undefined. */
function awaitedDecl(statement) {
  const decl = onlyConst(statement);
  return decl !== undefined && awaitsUntyped(decl) ? decl : undefined;
}

const errorRefs = (ifStmt) =>
  ifStmt.getParent().getDescendantsOfKind(SyntaxKind.Identifier).filter(isErrorRef).length;

/** The `const` before an `if (error) throw dbError(error[, 'code'])`, when they form one site. */
export function siteOf(ifStmt) {
  const statement = ifStmt.getPreviousSibling();
  const decl = awaitedDecl(statement);
  const data = decl === undefined ? null : plainBinding(decl);
  if (typeof data !== 'string' || errorRefs(ifStmt) !== 3) return null;
  return { statement, awaited: decl.getInitializer().getExpression(), data };
}
