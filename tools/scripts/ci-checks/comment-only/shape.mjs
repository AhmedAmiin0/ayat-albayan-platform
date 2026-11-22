// The canonical AST walk: node kinds and exact leaf text. Comments are trivia, not nodes, so a
// comment-only change leaves the walk unchanged. In JSX an empty `{/* … */}` child goes and each
// text is compared as React renders it, so only changes React cannot see pass.
import { childrenOf, KIND_NAMES, parse, SyntaxKind } from './source.mjs';

const isEmptyJsxExpression = (node) =>
  node.kind === SyntaxKind.JsxExpression && node.expression === undefined;

/**
 * React's JSX text rule: per line, spaces and tabs go at the line-break ends only, empty lines go,
 * the rest join with one space. Never `\s`: NBSP is rendered.
 */
function jsxText(text) {
  const lines = text.split(/\r\n|\n|\r/);
  const last = lines.length - 1;
  return lines
    .map((line, i) => (i === 0 ? line : line.replace(/^[ \t]+/, '')))
    .map((line, i) => (i === last ? line : line.replace(/[ \t]+$/, '')))
    .filter((line) => line !== '')
    .join(' ');
}

/**
 * Children as `{ node }` items; each JSX text is rendered on its own (as React does) and texts
 * left adjacent by a removed JSX comment are concatenated. Empty texts render nothing and go.
 */
function items(node, sf) {
  return childrenOf(node, sf)
    .filter((child) => !isEmptyJsxExpression(child))
    .map((child) =>
      child.kind === SyntaxKind.JsxText ? { text: jsxText(child.text) } : { node: child },
    )
    .reduce((out, child) => {
      const last = out.at(-1);
      const joins = child.text !== undefined && last?.text !== undefined;
      return joins ? [...out.slice(0, -1), { text: last.text + child.text }] : [...out, child];
    }, [])
    .filter((item) => item.text !== '');
}

/** A leaf's text; a list whose children were all comments and layout reads as empty. */
const leafText = (node, sf) => (childrenOf(node, sf).length === 0 ? node.getText(sf) : '');

/** `{ path, sig }` for every node in document order. */
function walk({ node, sf, path, out }) {
  const here = `${path} > ${KIND_NAMES[node.kind]}`;
  const children = items(node, sf);
  const leaf = children.length === 0 ? `:${leafText(node, sf)}` : '';
  out.push({ path: here, sig: `${KIND_NAMES[node.kind]}${leaf}` });
  children.forEach((item) =>
    item.node === undefined
      ? out.push({ path: `${here} > JsxText`, sig: `JsxText:${item.text}` })
      : walk({ node: item.node, sf, path: here, out }),
  );
  return out;
}

export function shapeOf(text, file) {
  const sf = parse(text, file);
  return walk({ node: sf, sf, path: '', out: [] }).map((e) => ({ ...e, path: e.path.slice(3) }));
}

const END = { path: '(end of file)', sig: '(nothing)' };

/** The first node where the two walks differ, as a message; null when they match. */
export function shapeDiff({ file, base, head }) {
  const [a, b] = [shapeOf(base, file), shapeOf(head, file)];
  const at = Array.from({ length: Math.max(a.length, b.length) }, (_, i) => i).find(
    (i) => a[i]?.sig !== b[i]?.sig,
  );
  if (at === undefined) return null;
  const [x, y] = [a[at] ?? END, b[at] ?? END];
  return `code differs at ${x.path}: base ${x.sig} → head ${y.sig}`;
}
