import ts from 'typescript';
import { no, ok, type Result } from '../../model/result.ts';
import { calleeName, isFunctionLike } from '../../model/source.ts';

/** A hook called in the JSX (`can={usePermissions()}`), lifted into the hook under `name`. */
export interface Hoist {
  call: ts.CallExpression;
  name: string;
}

const LOGIC = new Set([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
]);

const isBranchOf = (node: ts.Node, parent: ts.Node): boolean =>
  isFunctionLike(parent) ||
  (ts.isConditionalExpression(parent) && node !== parent.condition) ||
  (ts.isBinaryExpression(parent) && LOGIC.has(parent.operatorToken.kind) && node === parent.right);

/** True when `node` runs only sometimes: in a callback, a `?:` branch or after `&&`/`||`/`??`. */
function inBranch(node: ts.Node, root: ts.Node): boolean {
  if (node === root) return false;
  const parent = node.parent;
  return isBranchOf(node, parent) || inBranch(parent, root);
}

const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

function freeName(base: string, taken: Set<string>): string {
  const name =
    [base, ...Array.from({ length: 9 }, (_, i) => `${base}${i + 2}`)].find((n) => !taken.has(n)) ??
    base;
  taken.add(name);
  return name;
}

interface HoistAt {
  ret: ts.Node;
  guarded: boolean;
  taken: Set<string>;
}

/** The hoists of `calls` (all inside `ret`), or why they cannot move. */
export function hoistsOf(calls: readonly ts.CallExpression[], at: HoistAt): Result<Hoist[]> {
  if (calls.length > 0 && at.guarded) return no('a hook called in JSX while guards exist');
  if (calls.some((c) => inBranch(c, at.ret))) {
    return no('a hook called in a branch, a callback or a .map');
  }
  const base = (call: ts.CallExpression): string =>
    lowerFirst(calleeName(call).slice(3)) || 'value';
  return ok(calls.map((call) => ({ call, name: freeName(base(call), at.taken) })));
}
