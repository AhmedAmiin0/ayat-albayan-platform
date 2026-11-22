// Every comment in a file, found through the AST: the trivia before and after each node. Text in
// strings, templates, regexes and JSX is part of a token, never trivia, so it is never read here.
import { isDirective } from './patterns.mjs';
import {
  childrenOf,
  leadingComments,
  parse,
  SyntaxKind,
  trailingComments,
} from './source.mjs';

function nodesOf(node, sf, out = []) {
  out.push(node);
  childrenOf(node, sf).forEach((child) => nodesOf(child, sf, out));
  return out;
}

const isEmptyJsxBrace = (node) =>
  node.parent?.kind === SyntaxKind.JsxExpression && node.parent.expression === undefined;

const LAYOUT = new Set([SyntaxKind.JsxText, SyntaxKind.EndOfFileToken]);

/** Code tokens a comment-only change keeps: no JSX text, no braces of a removed `{/* … *\/}`. */
const codeTokenStarts = (nodes, sf) =>
  nodes
    .filter((n) => childrenOf(n, sf).length === 0 && !LAYOUT.has(n.kind) && !isEmptyJsxBrace(n))
    .map((n) => n.getStart(sf));

/** Each comment once, in file order, with `at`: how many code tokens come before it. */
export function placedCommentsOf(text, file) {
  const sf = parse(text, file);
  const nodes = nodesOf(sf, sf);
  const starts = codeTokenStarts(nodes, sf);
  const jsxText = nodes.filter((n) => n.kind === SyntaxKind.JsxText);
  const inJsxText = (pos) => jsxText.some((n) => pos >= n.pos && pos < n.end);
  const ranges = nodes.flatMap((n) => [
    ...leadingComments(text, n.pos),
    ...trailingComments(text, n.end),
  ]);
  const byPos = new Map(
    ranges.filter((r) => !inJsxText(r.pos)).map((r) => [r.pos, text.slice(r.pos, r.end)]),
  );
  return [...byPos]
    .sort(([a], [b]) => a - b)
    .map(([pos, comment]) => ({ comment, at: starts.filter((s) => s < pos).length }));
}

export const commentsOf = (text, file) => placedCommentsOf(text, file).map((c) => c.comment);

/** Directives with their place, so moving one to another statement is a change. */
export const placedDirectivesOf = (text, file) =>
  placedCommentsOf(text, file).filter(({ comment }) => isDirective(comment, file));

export const directivesOf = (text, file) => placedDirectivesOf(text, file).map((c) => c.comment);
