// One file's verdict: same shebang, same AST shape, same directive comments.
import { directivesOf } from './comments.mjs';
import { shapeDiff } from './shape.mjs';

const shebang = (text) => /^#!.*/.exec(text)?.[0] ?? '';

function shebangDiff({ base, head }) {
  const [a, b] = [shebang(base), shebang(head)];
  return a === b ? null : `shebang changed: ${JSON.stringify(a)} → ${JSON.stringify(b)}`;
}

const counts = (list) => list.reduce((m, c) => m.set(c, (m.get(c) ?? 0) + 1), new Map());

/** The first directive the two sides do not hold equally often, as a message. */
function directiveDiff({ file, base, head }) {
  const [a, b] = [counts(directivesOf(base, file)), counts(directivesOf(head, file))];
  const gone = [...a].find(([c, n]) => (b.get(c) ?? 0) < n)?.[0];
  const added = [...b].find(([c, n]) => (a.get(c) ?? 0) < n)?.[0];
  const messages = [
    gone === undefined ? null : `directive removed or edited: ${gone}`,
    added === undefined ? null : `directive added or edited: ${added}`,
  ];
  return messages.find((m) => m !== null) ?? null;
}

const CHECKS = [shebangDiff, shapeDiff, directiveDiff];

/** The first reason `head` is more than `base` minus comments, or null. */
export const compareFile = (sides) => CHECKS.reduce((found, check) => found ?? check(sides), null);
