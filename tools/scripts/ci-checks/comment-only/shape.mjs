// The canonical AST walk: node kinds and exact leaf text. Comments are trivia, not nodes, so a
// comment-only change leaves the walk unchanged. JSX gets the two normalisations React's own
// whitespace rule makes invisible: an empty `{/* … */}` child goes, and text is compared collapsed.
import { childrenOf, KIND_NAMES, parse, SyntaxKind } from './source.mjs';

const isEmptyJsxExpression = (node) =>
  node.kind === SyntaxKind.JsxExpression && node.expression === undefined;

const collapse = (text) => text.replace(/\s+/g, ' ').trim();

/** Children as `{ node }` items, adjacent JSX text merged into one `{ text }` item. */
function items(node, sf) {
  const merged = childrenOf(node, sf)
    .filter((child) => !isEmptyJsxExpression(child))
    .reduce((out, child) => {
      const last = out.at(-1);
      const isText = child.kind === SyntaxKind.JsxText;
      const joins = isText && last?.text !== undefined;
      return joins
        ? [...out.slice(0, -1), { text: last.text + child.text }]
        : [...out, isText ? { text: child.text } : { node: child }];
    }, []);
  return merged
    .map((item) => (item.text === undefined ? item : { text: collapse(item.text) }))
    .filter((item) => item.text !== '');
}

/** `{ path, sig }` for every node in document order. */
function walk({ node, sf, path, out }) {
  const here = `${path} > ${KIND_NAMES[node.kind]}`;
  const children = items(node, sf);
  const leaf = children.length === 0 ? `:${node.getText(sf)}` : '';
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
