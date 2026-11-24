// Suppressions only shrink (docs/59): every eslint-suppressions.json and oxlint-suppressions.json
// is held to the base branch's file by file and rule by rule, its entries followed through renames.
import { dirname } from 'node:path';

const HINT = '(fix it, never suppress it)';

/** `{ paths, files }` of suppressions files → `{ 'repo/path': { rule: count } }`. */
export function entriesOf({ paths, files }) {
  const out = {};
  paths.forEach((path, i) => {
    for (const [file, rules] of Object.entries(files[i])) {
      const byRule = (out[`${dirname(path)}/${file}`] ??= {});
      for (const [rule, { count }] of Object.entries(rules)) byRule[rule] = count;
    }
  });
  return out;
}

/** `base` keyed by where each file is in the head (`move`); files that land together add up. */
function moved(base, move) {
  const out = {};
  for (const [path, rules] of Object.entries(base)) {
    const byRule = (out[move(path)] ??= {});
    for (const [rule, count] of Object.entries(rules)) byRule[rule] = (byRule[rule] ?? 0) + count;
  }
  return out;
}

/** One line per file and rule whose count is above the base's (an entry it lacks counts 0). */
export function aboveFile(now, base, move) {
  const was = moved(base, move);
  return Object.entries(now)
    .flatMap(([path, rules]) =>
      Object.entries(rules).map(([rule, count]) => ({ path, rule, count })),
    )
    .map((e) => ({ ...e, before: was[e.path]?.[e.rule] ?? 0 }))
    .filter((e) => e.count > e.before)
    .map((e) => `above the base branch: ${e.path} ${e.rule} ${e.before} -> ${e.count} ${HINT}`);
}

/** Suppressions files the base lacks: a workspace without one never gets one. */
export function newFiles(head, base) {
  const was = new Set(base);
  return head
    .filter((path) => !was.has(path))
    .map((path) => `new suppressions file: ${path} (fix the violations instead)`);
}

/** Suppressions files with no entry left: the workspace is clean, so the file goes. */
export function emptyFiles({ paths, files }) {
  return paths
    .filter((_, i) => Object.keys(files[i]).length === 0)
    .map((path) => `empty: ${path} (delete it: the workspace is clean)`);
}
