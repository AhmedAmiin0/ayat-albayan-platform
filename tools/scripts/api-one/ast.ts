import ts from 'typescript';
import { findAll } from '../units/components/model/source.ts';

/** The node when `is` accepts it. */
export const narrow = <T extends ts.Node>(
  node: ts.Node | undefined,
  is: (n: ts.Node) => n is T,
): T | undefined => (node !== undefined && is(node) ? node : undefined);

const inner = (node: ts.Node): ts.Node | undefined =>
  narrow(node, ts.isParenthesizedExpression)?.expression ??
  narrow(node, ts.isAsExpression)?.expression;

/** `(x)` and `x as T` → x. */
export function unwrap(node: ts.Node | undefined): ts.Node | undefined {
  const next = node === undefined ? undefined : inner(node);
  return next === undefined ? node : unwrap(next);
}

export const lineOf = (node: ts.Node): number =>
  node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1;

/** The end of a statement with its line break, for removing a whole line. */
export const lineEnd = (node: ts.Node): number =>
  node.getSourceFile().text[node.getEnd()] === '\n' ? node.getEnd() + 1 : node.getEnd();

/** A property's plain key (`a` in `a: 1` or `{ a }`), or ''. */
export const propKey = (p: ts.ObjectLiteralElementLike): string =>
  narrow(p.name, ts.isIdentifier)?.text ?? '';

export const identifiersNamed = (root: ts.Node, name: string): ts.Identifier[] =>
  findAll(root, (n) => ts.isIdentifier(n) && n.text === name).filter(ts.isIdentifier);
