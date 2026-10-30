// The e2e job matrix from a selection (select.mjs). Usage:
//   node tools/scripts/ci-checks/e2e-areas/plan.mjs <selection.json>   -> lines for $GITHUB_OUTPUT
// Full suite = today's matrix (8 shards + single line). A selection gets as many shards as its measured
// time needs (e2e/shard-durations.json, ~90 s of specs per shard, at most 8, never more than its spec
// files), so no shard machine starts Supabase for nothing; «single line» (the six journeys, the smoke
// set) always runs. FAIL SAFE: a bad or missing selection = the full matrix.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const MAX_SHARDS = 8;
export const SHARD_MS = 90_000;
const DURATIONS = fileURLToPath(new URL('../../../../e2e/shard-durations.json', import.meta.url));

/** Estimated desktop ms of the specs; a spec never measured costs the median of the measured ones. */
export function estimateMs(specs, durations) {
  const known = Object.values(durations)
    .map((row) => row?.desktop)
    .filter((ms) => typeof ms === 'number')
    .sort((a, b) => a - b);
  const median = known.length ? known[Math.floor(known.length / 2)] : 10_000;
  return specs.reduce((sum, s) => sum + (durations[`tests/${s}`]?.desktop ?? median), 0);
}

/** { matrix, specs } for the e2e job: matrix = { include: [{ name, shard, total }] }. */
export function plan(selection, durations) {
  const ok = selection && selection.full === false && Array.isArray(selection.specs);
  const specs = ok ? selection.specs.filter((s) => /^[\w.-]+\.spec\.ts$/.test(s)) : [];
  if (!ok || specs.length !== selection.specs.length)
    return { matrix: matrixOf(MAX_SHARDS, MAX_SHARDS), specs: '' };
  const total = Math.min(
    MAX_SHARDS,
    specs.length,
    Math.ceil(estimateMs(specs, durations) / SHARD_MS),
  );
  return { matrix: matrixOf(total, total), specs: specs.map((s) => `tests/${s}`).join(' ') };
}

function matrixOf(shards, total) {
  const include = Array.from({ length: shards }, (_, i) => ({
    name: `e2e (${i + 1})`,
    shard: String(i + 1),
    total,
  }));
  include.push({ name: 'e2e (single line)', shard: 'single', total: Math.max(total, 1) });
  return { include };
}

function main() {
  const read = (file, fallback, what) => {
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      console.error(`::warning::${what} unreadable (${e instanceof Error ? e.message : e})`);
      return fallback;
    }
  };
  const selection = read(process.argv[2] ?? '', null, 'selection: full suite;');
  const { matrix, specs } = plan(selection, read(DURATIONS, {}, 'shard durations'));
  console.log(`e2e_matrix=${JSON.stringify(matrix)}`);
  console.log(`e2e_specs=${specs}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
