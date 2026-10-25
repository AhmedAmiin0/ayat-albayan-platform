// Literal-level part of pure-move-check: a string or anchored regex literal may change only by a rename
// of the same diff (a guard's path allow-list such as 'modules/whatsapp/kapso.ts' following its file).

const TOKENS = /(['"`])(?:\\.|(?!\1)[^\\])*\1|\/\^(?:\\.|[^/\\\n])*\/[a-z]*/g;
const stripExt = (p) => p.replace(/\.[cm]?[jt]sx?$/, '');

/** `old fragment → new fragments` for every path fragment a rename changes (file and folder suffixes). */
export function substitutions(renames) {
  const subs = new Map();
  const add = (a, b) => {
    if (a === b || a === '') return;
    if (!subs.has(a)) subs.set(a, new Set());
    subs.get(a).add(b);
  };
  for (const [from, to] of renames) {
    const cuts = [0, ...[...from].flatMap((c, i) => (c === '/' ? [i + 1] : []))];
    for (const k of cuts) {
      const base = from.slice(0, k);
      if (!to.startsWith(base)) continue;
      add(from.slice(k), to.slice(k));
      add(stripExt(from.slice(k)), stripExt(to.slice(k)));
      for (let end = from.indexOf('/', k); end > 0; end = from.indexOf('/', end + 1)) {
        const rest = from.slice(end);
        if (to.endsWith(rest) && to.length - rest.length >= k) add(from.slice(k, end), to.slice(k, to.length - rest.length));
      }
    }
  }
  return subs;
}

const unescape = (t) => t.replace(/\\([/.])/g, '$1');

/** True when `b` is `a` with one renamed path fragment (or all of them) replaced. */
export function renamedLiteral(a, b, subs) {
  const [x, y] = [unescape(a), unescape(b)];
  for (const [old, news] of subs) {
    if (!x.includes(old)) continue;
    for (const n of news) if (x.split(old).join(n) === y) return true;
  }
  return false;
}

/** Splits code into a skeleton (literals blanked) and its literals. */
export function literals(code) {
  const list = code.match(TOKENS) ?? [];
  return { skeleton: code.replace(TOKENS, '§'), list };
}

/** Same skeleton, and every literal either equal or changed by a rename. */
export function sameButRenames(a, b, subs) {
  const x = literals(a);
  const y = literals(b);
  if (x.skeleton !== y.skeleton || x.list.length !== y.list.length) return false;
  return x.list.every((t, i) => t === y.list[i] || renamedLiteral(t, y.list[i], subs));
}
