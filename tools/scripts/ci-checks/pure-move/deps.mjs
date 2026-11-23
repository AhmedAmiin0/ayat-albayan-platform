// Dependency edits a facade move may carry (CLAUDE.md rule 23, docs/32 R7): package.json and
// pnpm-lock.yaml may only gain or lose workspace links, and a workspace re-export
// (`export … from '@ab/<p>'`) may go, alone or as a whole file, once no head file imports any of
// its names through it.
import { WORKSPACE } from './exports.mjs';
import { nsName, statementsOf } from './statements.mjs';

const DEP_LINE = /^\s*"@ab\/[a-z0-9-]+": "workspace:\*",?$/;
const LOCK_KEY = /^(\s+)'@ab\/([a-z0-9-]+)':$/;
const CODE = /\.[cm]?[jt]sx?$/;
const ok = (good, kind, why) => (good ? { kind } : { kind: 'bad', why });

/** The lines of a package.json without its workspace dependency lines, trailing commas dropped. */
const withoutDeps = (text) =>
  text.split('\n').filter((l) => !DEP_LINE.test(l)).map((l) => l.replace(/,$/, ''));

export const depLinesOnly = (base, head) =>
  JSON.stringify(withoutDeps(base)) === JSON.stringify(withoutDeps(head));

/** True when lines i..i+2 are one importer's `'@ab/<p>'` link to packages/<p>. */
function isLink(lines, i) {
  const key = LOCK_KEY.exec(lines[i] ?? '');
  const pad = `${key?.[1] ?? '\0'}  `;
  const link = new RegExp(`^${pad}version: link:(\\S*/)?packages/${key?.[2] ?? '\0'}$`);
  return lines[i + 1] === `${pad}specifier: workspace:*` && link.test(lines[i + 2] ?? '');
}

/** The lockfile with every workspace link triple of its `importers:` section taken out. */
function withoutLinks(text) {
  const lines = text.split('\n');
  const start = lines.indexOf('importers:');
  const end = lines.findIndex((l, i) => i > start && /^\S/.test(l));
  const inside = (i) => start >= 0 && i > start && (end < 0 || i < end);
  const triple = (i) => (inside(i) && isLink(lines, i) ? [i, i + 1, i + 2] : []);
  const drop = new Set(lines.flatMap((_, i) => triple(i)));
  return lines.filter((_, i) => !drop.has(i)).join('\n');
}

export const lockLinksOnly = (base, head) => withoutLinks(base) === withoutLinks(head);

/** The names a workspace re-export statement makes `file` export (null when it is not one). */
function namesOf(modules, file, s) {
  const workspace = s.kind === 'export' && WORKSPACE.test(s.spec);
  const star = () => modules.namesOf(modules.resolve(file, s.spec));
  const NAMES = {
    star,
    ns: () => new Set([nsName(s.text)]),
    list: () => new Set(s.entries.map((e) => e.alias || e.name)),
    plain: () => null,
  };
  return workspace ? NAMES[s.shape]() : null;
}

/** True when each statement is a workspace re-export whose names no head file takes from `file`. */
export function droppable(modules, file, statements) {
  const sets = statements.map((s) => namesOf(modules, file, s));
  if (sets.includes(null)) return false;
  const names = new Set(sets.flatMap((set) => [...(set ?? [])]));
  return names.size === 0 || modules.unused(file, names);
}

/** A deleted file made only of workspace re-exports: a removed barrel when nobody imports it. */
function deletedBarrel(entry, read, { modules }) {
  const n = modules.normalize(read('base', entry.from));
  const list = statementsOf(n);
  const only = n.body === '' && list.length > 0 && list.every((s) => namesOf(modules, entry.from, s) !== null);
  if (!only) return null;
  return ok(droppable(modules, entry.from, list), 'barrel', 'a head file still imports through it');
}

const RULES = [
  [
    (e) => e.status === 'M' && /(^|\/)package\.json$/.test(e.to),
    (e, read) => ok(depLinesOnly(read('base', e.from), read('head', e.to)), 'config', 'not only workspace deps'),
  ],
  [
    (e) => e.status === 'M' && e.to === 'pnpm-lock.yaml',
    (e, read) => ok(lockLinksOnly(read('base', e.from), read('head', e.to)), 'config', 'not only workspace links'),
  ],
  [(e, ctx) => e.status === 'D' && CODE.test(e.to) && ctx.modules !== undefined, deletedBarrel],
];

/** The verdict for a dependency file or a deleted re-export file; null when no rule applies. */
export function classifyDeps(entry, read, ctx = {}) {
  const rule = RULES.find(([applies]) => applies(entry, ctx));
  return rule ? rule[1](entry, read, ctx) : null;
}
