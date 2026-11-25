// No new suppressions (docs/59, docs/31b §4). The violations that predate a rule sit in each
// package's oxlint-suppressions.json: old debt that only shrinks. On a PR, CI checks the base
// branch out beside it (GUARD_BASE) and holds every file to the base's, file by file and rule by
// rule, entries followed through renames: a count may only fall, and a file entry, a rule entry
// or a suppressions file the base lacks fails, as does a per-rule total above the base's.
// A PR that turns a rule on or tightens a limit fixes that rule's violations in the same PR. Also
// fails on an entry whose file is gone (a removed file stays gone: Oxlint never reports a file
// that does not exist) and on an empty file (delete it).
// Usage: [GUARD_BASE=<base checkout>] node tools/scripts/ci-checks/lint/lint-gate.mjs
//   or: --oxlint <report.json> [--prune] (oxlint/gate.mjs)
import { existsSync, globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gitRenames, mover } from './baselines/renames.mjs';
import { readJson } from './json-file.mjs';
import { BASELINE, oxlintCli } from './oxlint/gate.mjs';
import { baselineFile } from './oxlint/schemas.mjs';
import { aboveFile, emptyFiles, entriesOf, newFiles } from './suppressions/compare.mjs';

const DIRS = ['apps/*', 'packages/*', 'tools/*', 'e2e', 'docs/design/brand/tools'];

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
    .map((rule) => `${rule} ${base[rule] ?? 0} -> ${now[rule]}`)
    .map((change) => `above the base branch: ${change} (fix the new violations)`);
}

/** Entries of the suppressions file in package folder `dir` whose file is gone (deleted, moved). */
export function gone(dir, byFile, exists) {
  return Object.keys(byFile)
    .filter((key) => !exists(`${dir}/${key}`))
    .map((key) => `gone: ${dir}/${key} (pnpm lint:prune)`);
}

/** The head's suppressions files against the base's (`move`: base path → head's). */
export function againstBase({ head, base, move }) {
  return [
    ...aboveBase(totals(head.files), totals(base.files)),
    ...aboveFile(entriesOf(head), entriesOf(base), move),
    ...newFiles(head.paths, base.paths),
  ];
}

const sum = (byRule) => Object.values(byRule).reduce((a, b) => a + b, 0);

/** The oxlint-suppressions.json files of the tree at `dir`: their paths and contents. */
function suppressions(dir) {
  const paths = globSync(DIRS.map((d) => `${d}/${BASELINE}`), { cwd: dir }).sort();
  return { paths, files: paths.map((p) => readJson(join(dir, p), baselineFile)) };
}

function compared(root, dir, head) {
  if (!dir) return [];
  const move = mover(gitRenames(root, dir), (path) => !existsSync(join(root, path)));
  return againstBase({ head, base: suppressions(dir), move });
}

function main(args) {
  const root = fileURLToPath(new URL('../../../..', import.meta.url));
  if (args.includes('--oxlint')) return oxlintCli(root, args);
  const head = suppressions(root);
  const dir = process.env.GUARD_BASE;
  const exists = (path) => existsSync(join(root, path));
  const diff = [
    ...compared(root, dir, head),
    ...head.paths.flatMap((p, i) => gone(dirname(p), head.files[i], exists)),
    ...emptyFiles(head),
  ];
  const against = dir ? 'against the base branch' : 'no base branch given (GUARD_BASE)';
  console.log(`lint: ${sum(totals(head.files))} suppressed in ${head.paths.length} packages, ${against}`);
  for (const line of diff) console.log(`  ${line}`);
  if (diff.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
