// Literal-level part of pure-move-check: a string or anchored regex literal may change only by a rename
// of the same diff (a guard's path allow-list such as 'modules/whatsapp/kapso.ts' following its file), or a
// relative literal ('../../app') re-based so it still names the same place from the moved file.
import { target } from './pure-move-paths.mjs';

const stripExt = (p) => p.replace(/\.[cm]?[jt]sx?$/, '');

/** Every `old folder → new folder` whose files all moved to one new folder and that is gone at head. */
function folderRenames(renames, gone) {
  const dirs = new Map();
  for (const [from, to] of renames) {
    for (let end = from.lastIndexOf('/'); end > 0; end = from.lastIndexOf('/', end - 1)) {
      const rest = from.slice(end);
      const dir = from.slice(0, end);
      const next = to.endsWith(rest) ? to.slice(0, to.length - rest.length) : null;
      const seen = dirs.get(dir);
      dirs.set(dir, seen === undefined || seen === next ? next : null);
    }
  }
  return [...dirs].filter(([dir, next]) => next !== null && next !== dir && gone(dir));
}

/** `old fragment → new fragments`: path suffixes of renamed files and of folders that moved whole. */
export function substitutions(renames, gone = () => false) {
  const subs = new Map();
  const add = (a, b) => {
    if (a === b || a === '') return;
    if (!subs.has(a)) subs.set(a, new Set());
    subs.get(a).add(b);
  };
  for (const [from, to] of [...renames, ...folderRenames(renames, gone)]) {
    const cuts = [0, ...[...from].flatMap((c, i) => (c === '/' ? [i + 1] : []))];
    for (const k of cuts) {
      if (!to.startsWith(from.slice(0, k))) continue;
      add(from.slice(k), to.slice(k));
      add(stripExt(from.slice(k)), stripExt(to.slice(k)));
    }
  }
  return subs;
}

/** Regex escapes and Windows separators (`\\\\` in source) read as plain `/` paths. */
const unescape = (t) => t.replace(/\\\\/g, '/').replace(/\\([/.])/g, '$1');

/** True when `b` is `a` with one renamed path fragment (or all of them) replaced. */
export function renamedLiteral(a, b, subs) {
  const [x, y] = [unescape(a), unescape(b)];
  for (const [old, news] of subs) {
    if (!x.includes(old)) continue;
    for (const n of news) if (x.split(old).join(n) === y) return true;
  }
  return false;
}

/** End index (exclusive) of the quoted literal starting at `i`; templates track `${ … }` nesting. */
function literalEnd(code, i) {
  const q = code[i];
  let depth = 0;
  for (let j = i + 1; j < code.length; j += 1) {
    const c = code[j];
    if (c === '\\') j += 1;
    else if (q === '`' && c === '$' && code[j + 1] === '{') depth += 1;
    else if (q === '`' && depth > 0 && c === '}') depth -= 1;
    else if (c === q && depth === 0) return j + 1;
    else if (c === '\n' && q !== '`') return j;
  }
  return code.length;
}

const regexEnd = (code, i) => {
  const m = /^\/\^(?:\\.|[^/\\\n])*\/[a-z]*/.exec(code.slice(i));
  return m ? i + m[0].length : -1;
};

/** Splits code into a skeleton (literals blanked, whitespace squashed) and its literals. */
export function literals(code) {
  const list = [];
  let skeleton = '';
  for (let i = 0; i < code.length; ) {
    const c = code[i];
    const end = c === "'" || c === '"' || c === '`' ? literalEnd(code, i) : c === '/' ? regexEnd(code, i) : -1;
    if (end > i) {
      list.push(code.slice(i, end).replace(/\s+/g, ' '));
      skeleton += '§';
      i = end;
    } else {
      skeleton += c;
      i += 1;
    }
  }
  return { skeleton: skeleton.replace(/\s+/g, ' ').trim(), list };
}

const RELATIVE = /^(['"`])(\.\.?\/[^'"`]*)\1$/;

/** True when both are relative literals naming the same repo path, `a` from `from` and `b` from `to`. */
export function rebasedLiteral(a, b, { from, to }) {
  const [x, y] = [RELATIVE.exec(a), RELATIVE.exec(b)];
  if (!x || !y || from === undefined || to === undefined || from === to) return false;
  return target(from, x[2] ?? '') === target(to, y[2] ?? '');
}

/** Same skeleton, and every literal equal, changed by a rename or re-based. `opts`: subs, or { subs, from, to }. */
export function sameButRenames(a, b, opts) {
  const move = opts instanceof Map ? { subs: opts } : opts;
  const x = literals(a);
  const y = literals(b);
  if (x.skeleton !== y.skeleton || x.list.length !== y.list.length) return false;
  return x.list.every((t, i) => {
    const u = y.list[i] ?? '';
    return t === u || renamedLiteral(t, u, move.subs) || rebasedLiteral(t, u, move);
  });
}
