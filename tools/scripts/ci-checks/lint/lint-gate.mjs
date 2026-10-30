// Lint ratchet (docs/31a §5.1): the violations that predate a rule sit in each package's
// eslint-suppressions.json (`eslint . --suppress-all`); refactor/guards/lint.json holds their per-rule totals.
// Fails when a total grew or a rule is new (a count raised by hand), and when one shrank without the
// baseline (then `pnpm guard:lint -- --write`), so a fixed violation cannot come back unnoticed.
// Per rule over the whole repo, not per file: ESLint itself enforces the per-file counts.
// Usage: node tools/scripts/ci-checks/lint/lint-gate.mjs [--write]
import { existsSync, globSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FILES = ['apps/*', 'packages/*', 'tools/*', 'e2e'].map((dir) => `${dir}/eslint-suppressions.json`);

/** Per-rule totals (sorted by rule) of suppressions files shaped `{ file: { rule: { count } } }`. */
export function totals(files) {
  const out = {};
  const entries = files.flatMap((byFile) => Object.values(byFile).flatMap((rules) => Object.entries(rules)));
  for (const [rule, { count }] of entries) out[rule] = (out[rule] ?? 0) + count;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)));
}

/** One line per rule whose total is not the baseline's. */
export function differences(now, baseline) {
  const rules = [...new Set([...Object.keys(now), ...Object.keys(baseline)])].sort();
  return rules.flatMap((rule) => {
    const [is, was] = [now[rule] ?? 0, baseline[rule] ?? 0];
    if (is > was) return [`grew: ${rule} ${was} -> ${is}`];
    if (is < was) return [`shrank: ${rule} ${was} -> ${is} (pnpm guard:lint -- --write)`];
    return [];
  });
}

const sum = (byRule) => Object.values(byRule).reduce((a, b) => a + b, 0);

function main(args) {
  const root = fileURLToPath(new URL('../../../..', import.meta.url));
  const paths = globSync(FILES, { cwd: root }).sort();
  const now = totals(paths.map((p) => JSON.parse(readFileSync(join(root, p), 'utf8'))));
  const file = join(root, 'refactor', 'guards', 'lint.json');
  if (args.includes('--write')) writeFileSync(file, `${JSON.stringify(now, null, 2)}\n`);
  const baseline = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const diff = differences(now, baseline);
  console.log(`lint: ${sum(now)} suppressed in ${paths.length} packages, baseline ${sum(baseline)}`);
  for (const line of diff) console.log(`  ${line}`);
  if (diff.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
