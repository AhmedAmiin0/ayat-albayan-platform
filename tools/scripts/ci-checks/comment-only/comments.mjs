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

/** The comment texts of `text`, once each, in file order. */
export function commentsOf(text, file) {
  const sf = parse(text, file);
  const nodes = nodesOf(sf, sf);
  const jsxText = nodes.filter((n) => n.kind === SyntaxKind.JsxText);
  const inJsxText = (pos) => jsxText.some((n) => pos >= n.pos && pos < n.end);
  const ranges = nodes.flatMap((n) => [
    ...leadingComments(text, n.pos),
    ...trailingComments(text, n.end),
  ]);
  const byPos = new Map(
    ranges.filter((r) => !inJsxText(r.pos)).map((r) => [r.pos, text.slice(r.pos, r.end)]),
  );
  return [...byPos].sort(([a], [b]) => a - b).map(([, comment]) => comment);
}

export const directivesOf = (text, file) => commentsOf(text, file).filter(isDirective);
