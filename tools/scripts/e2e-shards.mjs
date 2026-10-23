// e2e shard plan for ci.yml: which spec files shard N of M runs, balanced on measured durations instead of
// Playwright's --shard (which splits by test count: one shard took 10 min while another took 6).
// Every spec lands in exactly one shard; a spec missing from the durations file gets the median duration.
// Usage: node tools/scripts/e2e-shards.mjs plan <shard> <total> <desktop|all>   paths relative to e2e/, one per line
//        node tools/scripts/e2e-shards.mjs merge <durations-*.json…>            new e2e/shard-durations.json on stdout
// The durations-*.json files are the CI artifacts «e2e-durations-*» (e2e/support/durations-reporter.ts).
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const DURATIONS = root('e2e/shard-durations.json');
const isSpec = (f) => /\.spec\.ts$/.test(f);

/** ms a file costs in this run: desktop only on PRs, desktop + mobile on pushes. */
function cost(row, projects) {
  if (!row) return undefined;
  return projects.reduce((sum, p) => sum + (row[p] ?? 0), 0);
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 1000;
};

/**
 * Longest-first greedy split: each file (slowest first, ties by name) goes to the lightest shard.
 * Deterministic, so every shard machine computes the same plan.
 */
export function planShards({ files, durations, total, projects }) {
  if (!Number.isInteger(total) || total < 1) throw new Error(`bad shard total ${total}`);
  const known = files.map((f) => cost(durations[f], projects)).filter((x) => x !== undefined);
  const fallback = median(known);
  const weighted = files.map((f) => ({ f, ms: cost(durations[f], projects) ?? fallback }));
  weighted.sort((a, b) => b.ms - a.ms || a.f.localeCompare(b.f));
  const shards = Array.from({ length: total }, () => ({ ms: 0, files: [] }));
  for (const { f, ms } of weighted) {
    const lightest = shards.reduce((best, s) => (s.ms < best.ms ? s : best), shards[0]);
    lightest.files.push(f);
    lightest.ms += ms;
  }
  for (const s of shards) s.files.sort();
  return shards;
}

/** Sums several shard outputs (each file ran on one shard) into one { file: { project: ms } } map. */
export function mergeDurations(parts) {
  const out = {};
  for (const part of parts)
    for (const [file, row] of Object.entries(part)) {
      const target = (out[file] ??= {});
      for (const [project, ms] of Object.entries(row))
        target[project] = Math.round((target[project] ?? 0) + ms);
    }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

/** Playwright reads each CLI path as a case-insensitive RegExp: no path may also select another file. */
export function ambiguousPaths(paths) {
  const bad = [];
  for (const p of paths) {
    const re = new RegExp(p, 'i');
    for (const q of paths) if (q !== p && re.test(q)) bad.push(`${p} also matches ${q}`);
  }
  return bad;
}

export const specFiles = () =>
  readdirSync(root('e2e/tests'))
    .filter(isSpec)
    .sort()
    .map((f) => `tests/${f}`);

function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === 'merge') {
    const parts = args.map((f) => JSON.parse(readFileSync(f, 'utf8')));
    process.stdout.write(`${JSON.stringify(mergeDurations(parts), null, 1)}\n`);
    return;
  }
  if (mode !== 'plan')
    throw new Error('usage: e2e-shards.mjs plan <shard> <total> <desktop|all> | merge <files…>');
  const [shard, total] = [Number(args[0]), Number(args[1])];
  const projects = args[2] === 'desktop' ? ['desktop'] : ['desktop', 'mobile'];
  const files = specFiles();
  const bad = ambiguousPaths(files);
  if (bad.length) throw new Error(`ambiguous spec paths: ${bad.join('; ')}`);
  const shards = planShards({
    files,
    durations: JSON.parse(readFileSync(DURATIONS, 'utf8')),
    total,
    projects,
  });
  const mine = shards[shard - 1];
  if (!mine || mine.files.length === 0)
    throw new Error(`shard ${args[0]}/${args[1]} has no spec files`);
  console.error(
    `shard ${shard}/${total}: ${mine.files.length} files, ~${Math.round(mine.ms / 1000)} s (${projects.join('+')})`,
  );
  console.log(mine.files.join('\n'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
