// e2e shard sizes for ci.yml. Playwright's --shard cuts its ordered (project, file) groups into equal TEST
// COUNTS, so one shard took 10 min and another 6. This keeps Playwright's own order and contiguous cuts
// (the specs share one database per shard, so a different neighbour can change a result) and only moves
// the cut points so that every shard costs about the same measured time. The result is the value of
// PWTEST_SHARD_WEIGHTS (Playwright 1.63 reads it as the shard sizes); without it, equal counts as before.
// Usage: node tools/scripts/e2e-shards.mjs weights <total> <groups.json>  groups = E2E_GROUPS_FILE of a --list run
//        node tools/scripts/e2e-shards.mjs merge <durations-*.json…>    new e2e/shard-durations.json on stdout
// The durations-*.json files come from e2e/support/durations-reporter.ts (CI artifacts «e2e-durations-*»).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DURATIONS = fileURLToPath(new URL('../../../e2e/shard-durations.json', import.meta.url));

/** The groups e2e/support/durations-reporter.ts wrote with --list (E2E_GROUPS_FILE), checked. */
export function checkGroups(groups) {
  const ok =
    Array.isArray(groups) &&
    groups.length > 0 &&
    groups.every(
      (g) => typeof g?.project === 'string' && typeof g?.file === 'string' && g.tests > 0,
    );
  if (!ok) throw new Error('no usable shard groups (Playwright internals changed?)');
  return groups;
}

/** ms per group; a group never measured costs the median ms per test of the measured ones. */
export function costs(groups, durations) {
  const perTest = groups
    .filter((g) => durations[g.file]?.[g.project] !== undefined)
    .map((g) => durations[g.file][g.project] / g.tests)
    .sort((a, b) => a - b);
  const fallback = perTest.length ? perTest[Math.floor(perTest.length / 2)] : 1000;
  return groups.map((g) => durations[g.file]?.[g.project] ?? fallback * g.tests);
}

/**
 * Contiguous split of the groups into `total` shards with the smallest possible slowest shard
 * (dynamic programming over the cut points). Returns the TEST COUNT of each shard.
 */
export function shardSizes(groups, ms, total) {
  if (!Number.isInteger(total) || total < 1) throw new Error(`bad shard total ${total}`);
  const n = groups.length;
  const pre = [0];
  for (let i = 0; i < n; i++) pre.push(pre[i] + ms[i]);
  // best[k][i] = slowest shard when the first i groups go to k shards; cut[k][i] = start of the last one.
  const best = Array.from({ length: total + 1 }, () => new Array(n + 1).fill(Infinity));
  const cut = Array.from({ length: total + 1 }, () => new Array(n + 1).fill(0));
  best[0][0] = 0;
  for (let k = 1; k <= total; k++) {
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= i; j++) {
        const v = Math.max(best[k - 1][j], pre[i] - pre[j]);
        if (v < best[k][i]) [best[k][i], cut[k][i]] = [v, j];
      }
    }
  }
  const sizes = [];
  for (let k = total, i = n; k > 0; k--) {
    const j = cut[k][i];
    sizes.unshift(groups.slice(j, i).reduce((s, g) => s + g.tests, 0));
    i = j;
  }
  return sizes;
}

/** Sums several shard outputs (each file ran on one shard) into one { file: { project: ms } } map. */
export function mergeDurations(parts) {
  const out = {};
  for (const part of parts) {
    for (const [file, row] of Object.entries(part)) {
      const target = (out[file] ??= {});
      for (const [project, ms] of Object.entries(row))
        target[project] = Math.round((target[project] ?? 0) + ms);
    }
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

function main() {
  const [mode, ...args] = process.argv.slice(2);
  const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
  if (mode === 'merge') {
    process.stdout.write(`${JSON.stringify(mergeDurations(args.map(read)), null, 1)}\n`);
    return;
  }
  if (mode !== 'weights')
    throw new Error('usage: e2e-shards.mjs weights <total> <list.json> | merge <files…>');
  const groups = checkGroups(read(args[1]));
  const ms = costs(groups, read(DURATIONS));
  const sizes = shardSizes(groups, ms, Number(args[0]));
  if (sizes.some((s) => s === 0)) throw new Error(`a shard would be empty: ${sizes.join(':')}`);
  console.error(
    `shard sizes ${sizes.join(':')} (tests), ~${Math.round(Math.max(...shardMs(groups, ms, sizes)) / 1000)} s slowest`,
  );
  console.log(sizes.join(':'));
}

/** Estimated ms of each shard for given sizes (for the log line). */
export function shardMs(groups, ms, sizes) {
  const out = sizes.map(() => 0);
  let shard = 0;
  let left = sizes[0];
  groups.forEach((g, i) => {
    while (left <= 0 && shard < sizes.length - 1) left = sizes[++shard];
    out[shard] += ms[i];
    left -= g.tests;
  });
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
