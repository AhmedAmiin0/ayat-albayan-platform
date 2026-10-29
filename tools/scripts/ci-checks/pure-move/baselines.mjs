// Path-keyed baselines in a move PR (docs/27 §4): ESLint bulk suppressions (`<pkg>/eslint-suppressions.json`,
// keyed by PACKAGE-relative paths), the knip baseline and the folder-cap allow-lists (repo paths). A pure move
// may only carry an entry to its file's (or whole folder's) new path. Suppressions keep every entry and count
// exactly; the knip and folder-cap baselines may also shrink (their own gates check them against the tree).
import { posix } from 'node:path';
import { folderRenames } from '../pure-move-tokens.mjs';

const SUPPRESSIONS = /(^|\/)eslint-suppressions\.json$/;
const KNIP = /^refactor\/guards\/knip\.json$/;
const FOLDER_CAP = /^refactor\/folder-cap\/[^/]+\.json$/;

/** The renames inside `dir`, as paths relative to it (a move out of the package has no relative form). */
export function relativePairs(dir, renames) {
  if (dir === '' || dir === '.') return renames;
  const pre = `${dir}/`;
  return renames
    .filter(([from, to]) => from.startsWith(pre) && to.startsWith(pre))
    .map(([from, to]) => [from.slice(pre.length), to.slice(pre.length)]);
}

const sortKeys = (_k, v) =>
  v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : v;
const canon = (v) => JSON.stringify(v, sortKeys);
const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const parse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** `base` with every key renamed by `table` (null when two entries would land on one key). */
function rekey(base, table) {
  const out = new Map();
  for (const [key, value] of Object.entries(base)) {
    const next = table.get(key) ?? key;
    if (out.has(next)) return null;
    out.set(next, value);
  }
  return out;
}

/** True when `head` is `base` with each moved file's key renamed (package-relative) and every count kept. */
export function suppressionsMoved(file, texts, renames) {
  const [base, head] = [parse(texts.base), parse(texts.head)];
  if (!isRecord(base) || !isRecord(head)) return false;
  const moved = rekey(base, new Map(relativePairs(posix.dirname(file), renames)));
  return moved !== null && canon(Object.fromEntries(moved)) === canon(head);
}

/** True when every head knip line is a base line, its file (first word) at its new path. */
export function knipMoved(texts, renames) {
  const [base, head] = [parse(texts.base), parse(texts.head)];
  if (!Array.isArray(base) || !Array.isArray(head)) return false;
  const table = new Map(renames);
  const move = (line) => {
    const cut = String(line).indexOf(' ');
    const path = cut < 0 ? String(line) : String(line).slice(0, cut);
    return `${table.get(path) ?? path}${cut < 0 ? '' : String(line).slice(cut)}`;
  };
  const allowed = new Set(base.map(move));
  return head.every((line) => typeof line === 'string' && allowed.has(line));
}

const within = (c, was) =>
  isRecord(c) && isRecord(was) && Number.isInteger(c.files) && Number.isInteger(c.dirs) && c.files <= was.files && c.dirs <= was.dirs;

/** True when every head folder-cap entry is a base entry (its folder at its new place if moved whole), not grown. */
export function folderCapMoved(texts, renames, gone) {
  const [base, head] = [parse(texts.base), parse(texts.head)];
  if (!isRecord(base) || !isRecord(head)) return false;
  const moved = rekey(base, new Map(folderRenames(renames, gone)));
  return moved !== null && Object.entries(head).every(([folder, c]) => moved.has(folder) && within(c, moved.get(folder)));
}

/** The verdict for a path-keyed baseline file (null: not one, the other rules apply). */
export function classifyBaseline(entry, read, ctx = {}) {
  const { status, from, to } = entry;
  const kind = SUPPRESSIONS.test(to) ? 'suppressions' : KNIP.test(to) ? 'knip' : FOLDER_CAP.test(to) ? 'folder-cap' : null;
  if (kind === null || status === 'R100') return null;
  if (status !== 'M' || from !== to) return { kind: 'bad', why: `${status}: a move only edits a ${kind} baseline in place` };
  const texts = { base: read('base', from), head: read('head', to) };
  const renames = ctx.renames ?? [];
  const ok =
    kind === 'suppressions'
      ? suppressionsMoved(to, texts, renames)
      : kind === 'knip'
        ? knipMoved(texts, renames)
        : folderCapMoved(texts, renames, ctx.gone ?? (() => false));
  return ok ? { kind: 'paths' } : { kind: 'bad', why: `${kind}: changes more than the keys of moved files` };
}
