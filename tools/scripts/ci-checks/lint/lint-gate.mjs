// No new suppressions (docs/59, docs/31a §5.1). The violations that predate a rule sit in each
// package's eslint-suppressions.json and oxlint-suppressions.json: old debt that only shrinks. On a
// PR, CI checks the base branch out beside it (GUARD_BASE) and holds both kinds of file to the
// base's, file by file and rule by rule, entries followed through renames: a count may only fall,
// and a file entry, a rule entry or a suppressions file the base lacks fails, as does a per-rule
// total over the repo above the base's. A PR that turns a rule on or tightens a limit fixes that
// rule's violations in the same PR. Also fails on an entry whose file is gone (ESLint lints only
// files that exist, so it never reports those), on an empty file (delete it), and when the root
// .oxlintrc.json (the first lint pass, no bulk suppressions) runs a rule that has suppressions.
// Usage: [GUARD_BASE=<base checkout>] node tools/scripts/ci-checks/lint/lint-gate.mjs
//   or: --oxlint <report.json> [--prune] (oxlint/gate.mjs)
import { existsSync, globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gitRenames, mover } from './baselines/renames.mjs';
import { readJson } from './json-file.mjs';
import { BASELINE, oxlintCli } from './oxlint/gate.mjs';
import { baselineFile, oxlintrcFile } from './oxlint/schemas.mjs';
import { aboveFile, emptyFiles, entriesOf, newFiles } from './suppressions/compare.mjs';

const DIRS = ['apps/*', 'packages/*', 'tools/*', 'e2e', 'docs/design/brand/tools'];
const FILES = (name) => DIRS.map((dir) => `${dir}/${name}`);

/** Per-rule totals (sorted by rule) of suppressions files `{ file: { rule: { count } } }`. */
export function totals(files) {
  const out = {};
  const entries = files.flatMap((byFile) =>
    Object.values(byFile).flatMap((rules) => Object.entries(rules)),
  );
  for (const [rule, { count }] of entries) out[rule] = (out[rule] ?? 0) + count;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)));
}

/** On a PR: one line per rule whose total is above the base branch's (a rule it lacks: from 0). */
export function aboveBase(now, base) {
  return Object.keys(now)
    .filter((rule) => now[rule] > (base[rule] ?? 0))
    .map((rule) => `above the base branch: ${rule} ${base[rule] ?? 0} -> ${now[rule]} (fix the new violations)`);
}

/** Entries of the suppressions file in package folder `dir` whose file is gone (deleted, moved). */
export function gone(dir, byFile, exists) {
  return Object.keys(byFile)
    .filter((key) => !exists(`${dir}/${key}`))
    .map((key) => `gone: ${dir}/${key} (eslint . --prune-suppressions)`);
}

const bare = (rule) => rule.replace(/^(eslint|typescript|@typescript-eslint)\//, '');

/**
 * Rules the root .oxlintrc.json runs that still have suppressed violations. Oxlint has no bulk
 * suppressions, so such a rule must stay in ESLint. `typescript/x`, `@typescript-eslint/x` and `x`
 * are one rule here
 * (eslint-plugin-oxlint turns the base rule and its typescript-eslint extension off together).
 */
export function oxlintSuppressed(oxlintrc, now) {
  const blocks = [oxlintrc, ...(oxlintrc.overrides ?? [])];
  const moved = new Set(blocks.flatMap((b) => Object.keys(b.rules ?? {})).map(bare));
  return Object.keys(now)
    .filter((rule) => moved.has(bare(rule)))
    .map((rule) => `oxlint runs ${rule}, which has ${now[rule]} suppressed: keep it in ESLint`);
}

const KINDS = { eslint: '', oxlint: 'oxlint ' };

/** Both kinds of suppressions file of the head against the base's (`move`: base path → head's). */
export function againstBase({ head, base, move }) {
  return Object.entries(KINDS).flatMap(([kind, prefix]) =>
    [
      ...aboveBase(totals(head[kind].files), totals(base[kind].files)),
      ...aboveFile(entriesOf(head[kind]), entriesOf(base[kind]), move),
      ...newFiles(head[kind].paths, base[kind].paths),
    ].map((line) => `${prefix}${line}`),
  );
}

const sum = (byRule) => Object.values(byRule).reduce((a, b) => a + b, 0);

/** The `name` suppressions files of the tree at `dir`: their paths and contents. */
function suppressions(dir, name = 'eslint-suppressions.json') {
  const paths = globSync(FILES(name), { cwd: dir }).sort();
  return { paths, files: paths.map((p) => readJson(join(dir, p), baselineFile)) };
}

const bothKinds = (dir) => ({ eslint: suppressions(dir), oxlint: suppressions(dir, BASELINE) });

function compared(root, dir, head) {
  if (!dir) return [];
  const move = mover(gitRenames(root, dir), (path) => !existsSync(join(root, path)));
  return againstBase({ head, base: bothKinds(dir), move });
}

function main(args) {
  const root = fileURLToPath(new URL('../../../..', import.meta.url));
  if (args.includes('--oxlint')) return oxlintCli(root, args);
  const head = bothKinds(root);
  const dir = process.env.GUARD_BASE;
  const exists = (path) => existsSync(join(root, path));
  const now = totals(head.eslint.files);
  const diff = [
    ...compared(root, dir, head),
    ...head.eslint.paths.flatMap((p, i) => gone(dirname(p), head.eslint.files[i], exists)),
    ...emptyFiles(head.eslint),
    ...emptyFiles(head.oxlint),
    ...oxlintSuppressed(readJson(join(root, '.oxlintrc.json'), oxlintrcFile), now),
  ];
  const against = dir ? 'against the base branch' : 'no base branch given (GUARD_BASE)';
  console.log(`lint: ${sum(now)} suppressed in ${head.eslint.paths.length} packages, ${against}`);
  for (const line of diff) console.log(`  ${line}`);
  if (diff.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
