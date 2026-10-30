// Lint ratchet (docs/31a §5.1): the violations that predate a rule sit in each package's
// eslint-suppressions.json (`eslint . --suppress-all`); refactor/guards/lint.json holds their per-rule totals.
// Fails when a total grew or a rule is new (a count raised by hand), and when one shrank without the
// baseline (then `pnpm guard:lint -- --write`), so a fixed violation cannot come back unnoticed.
// Per rule over the whole repo, not per file: ESLint itself enforces the per-file counts. Also fails when the
// root .oxlintrc.json (the first lint pass, no bulk suppressions) runs a rule that has suppressed violations.
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

const bare = (rule) => rule.replace(/^(eslint|typescript|@typescript-eslint)\//, '');

/**
 * Rules the root .oxlintrc.json runs that still have suppressed violations. Oxlint has no bulk suppressions,
 * so such a rule must stay in ESLint. `typescript/x`, `@typescript-eslint/x` and `x` are one rule here
 * (eslint-plugin-oxlint turns the base rule and its typescript-eslint extension off together).
 */
export function oxlintSuppressed(oxlintrc, now) {
  const blocks = [oxlintrc, ...(oxlintrc.overrides ?? [])];
  const moved = new Set(blocks.flatMap((b) => Object.keys(b.rules ?? {})).map(bare));
  return Object.keys(now)
    .filter((rule) => moved.has(bare(rule)))
    .map((rule) => `oxlint runs ${rule}, which has ${now[rule]} suppressed: keep it in ESLint`);
}

const sum = (byRule) => Object.values(byRule).reduce((a, b) => a + b, 0);

function main(args) {
  const root = fileURLToPath(new URL('../../../..', import.meta.url));
  const paths = globSync(FILES, { cwd: root }).sort();
  const now = totals(paths.map((p) => JSON.parse(readFileSync(join(root, p), 'utf8'))));
  const file = join(root, 'refactor', 'guards', 'lint.json');
  if (args.includes('--write')) writeFileSync(file, `${JSON.stringify(now, null, 2)}\n`);
  const baseline = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const oxlintrc = JSON.parse(readFileSync(join(root, '.oxlintrc.json'), 'utf8'));
  const diff = [...differences(now, baseline), ...oxlintSuppressed(oxlintrc, now)];
  console.log(`lint: ${sum(now)} suppressed in ${paths.length} packages, baseline ${sum(baseline)}`);
  for (const line of diff) console.log(`  ${line}`);
  if (diff.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
