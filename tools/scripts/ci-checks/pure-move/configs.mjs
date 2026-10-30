// Config files in a move PR (docs/32 critic correction 5): they may follow moved files, nothing more.
// Workflows and tsconfigs: only moved paths (repo or package-relative) change. The root knip.json: each
// workspace's own relative paths follow moves inside it. refactor/: new or extended move maps, docs, and the
// count baselines (jscpd, lint) with the same keys and counts at or below base. Anything else fails.
import { posix } from 'node:path';
import { relativePairs } from './baselines.mjs';

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Whole paths of moved files replaced by their new path (as the codemod writes them). */
export const rewritePaths = (text, pairs) =>
  pairs.reduce((acc, [f, t]) => acc.replace(new RegExp(`(?<![\\w./-])${escape(f)}(?![\\w-]|\\.\\w)`, 'g'), t), text);

const parse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};
const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Every string of a JSON value mapped through `fn`. */
const mapStrings = (v, fn) =>
  typeof v === 'string'
    ? fn(v)
    : Array.isArray(v)
      ? v.map((x) => mapStrings(x, fn))
      : isRecord(v)
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, fn)]))
        : v;

/** Root knip.json: repo paths anywhere, and each workspace's relative paths for moves inside it. */
export function knipConfigMoved(texts, renames) {
  const [base, head] = [parse(rewritePaths(texts.base, renames)), parse(texts.head)];
  if (!isRecord(base) || !isRecord(head)) return false;
  const ws = isRecord(base.workspaces) ? base.workspaces : {};
  const moved = Object.fromEntries(
    Object.entries(ws).map(([dir, cfg]) => {
      const table = new Map(dir === '.' ? [] : relativePairs(dir, renames));
      return [dir, mapStrings(cfg, (s) => table.get(posix.normalize(s)) ?? s)];
    }),
  );
  return JSON.stringify({ ...base, workspaces: moved }) === JSON.stringify(head);
}

/** A count baseline (`{ key: number }`, nested allowed): same keys, every number at or below base. */
export function countsNotRaised(base, head) {
  if (typeof base === 'number') return typeof head === 'number' && head <= base;
  if (!isRecord(base) || !isRecord(head)) return false;
  return Object.entries(head).every(([k, v]) => Object.hasOwn(base, k) && countsNotRaised(base[k], v));
}

const COUNTS = /^refactor\/guards\/(jscpd|lint)\.json$/;
const MAPS = /^refactor\/moves\/[^/]+\.json$/;
const ok = { kind: 'config' };
const bad = (why) => ({ kind: 'bad', why });

/** The verdict for a config file edited in place: what its kind lets a move change. */
function editedInPlace(to, texts, renames) {
  if (COUNTS.test(to)) {
    return countsNotRaised(parse(texts.base), parse(texts.head)) ? ok : bad('a baseline count rose or gained a key');
  }
  if (/(^|\/)knip\.json$/.test(to) && !to.startsWith('refactor/')) {
    return knipConfigMoved(texts, renames) ? ok : bad('knip.json changes more than moved file paths');
  }
  if (/^\.github\/workflows\//.test(to) || /(^|\/)tsconfig[^/]*\.json$/.test(to)) {
    const pairs = [...renames, ...relativePairs(posix.dirname(to), renames)];
    return rewritePaths(texts.base, pairs) === texts.head ? ok : bad('changes more than moved file paths');
  }
  return bad('config a move may not change');
}

/** The verdict for a non-code config file of a move PR (`.md`: free under refactor/, paths only elsewhere). */
export function classifyConfig(entry, read, renames) {
  const { status, from, to } = entry;
  if (/\.md$/.test(to) && to.startsWith('refactor/')) return ok;
  if (/\.md$/.test(to)) return status === 'M' && rewritePaths(read('base', from), renames) === read('head', to) ? ok : bad('a doc changes more than moved file paths');
  if (MAPS.test(to)) return status === 'A' || status === 'M' ? ok : bad(`${status}: move maps are only added or extended`);
  if (status !== 'M') return bad(`${status}: a move only edits config in place`);
  return editedInPlace(to, { base: read('base', from), head: read('head', to) }, renames);
}
