// Lint ratchet (docs/31a §5.1): the violations that predate a rule sit in each package's
// eslint-suppressions.json (`eslint . --suppress-all`); refactor/guards/lint.json holds their per-rule totals.
// Fails when a total grew or a rule is new (a count raised by hand), and when one shrank without the
// baseline (then `pnpm guard:lint -- --write`), so a fixed violation cannot come back unnoticed.
// Per rule over the whole repo, not per file: ESLint itself enforces the per-file counts. On a PR, CI also passes
// the base branch's lint.json (--base): no total may rise above it, so re-running `eslint --suppress-all` and
// `--write` cannot raise both files and pass. Also fails on an entry whose file is gone (ESLint lints only files that
// exist, so it never reports those), and when the root .oxlintrc.json (the first lint pass, no bulk suppressions)
// runs a rule that has suppressed violations.
// Usage: node tools/scripts/ci-checks/lint/lint-gate.mjs [--write] [--base <the base branch's lint.json>]
//   [--configs <base ESLint config sources> <head ESLint config sources>] (a rule the PR turns on: newRule)
import { existsSync, globSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIRS = ['apps/*', 'packages/*', 'tools/*', 'e2e', 'docs/design/brand/tools'];
const FILES = DIRS.map((dir) => `${dir}/eslint-suppressions.json`);

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

/**
 * On a PR: one line per rule whose total is above the base branch's (a rule the base lacks counts from 0,
 * unless `isNew(rule)`: its one-time baseline, docs/32 §1).
 */
export function aboveBase(now, base, isNew = () => false) {
  return Object.keys(now)
    .filter((rule) => now[rule] > (base[rule] ?? 0))
    .filter((rule) => Object.hasOwn(base, rule) || !isNew(rule))
    .map((rule) => `above the base branch: ${rule} ${base[rule] ?? 0} -> ${now[rule]} (fix the new violations)`);
}

const named = (text, rule) => text.includes(`'${rule}'`) || text.includes(`"${rule}"`);

/**
 * A rule this PR turns on: its quoted name is in the head's ESLint config sources and in none of the base's.
 * A preset rule that no config names stays at its base total until a reviewed config edit names it.
 */
export const newRule = (configs) => (rule) => named(configs.head, rule) && !named(configs.base, rule);

/** Entries of the suppressions file in package folder `dir` whose file is gone (deleted or moved). */
export function gone(dir, byFile, exists) {
  return Object.keys(byFile)
    .filter((key) => !exists(`${dir}/${key}`))
    .map((key) => `gone: ${dir}/${key} (eslint . --prune-suppressions)`);
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

/** `--configs <base> <head>`: the ESLint config sources of both sides, concatenated (empty: no new rule). */
function configTexts(args) {
  const at = args.indexOf('--configs');
  if (at === -1) return { base: '', head: '' };
  return { base: readFileSync(args[at + 1], 'utf8'), head: readFileSync(args[at + 2], 'utf8') };
}

const sum = (byRule) => Object.values(byRule).reduce((a, b) => a + b, 0);

function main(args) {
  const root = fileURLToPath(new URL('../../../..', import.meta.url));
  const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
  const paths = globSync(FILES, { cwd: root }).sort();
  const files = paths.map((p) => read(join(root, p)));
  const now = totals(files);
  const file = join(root, 'refactor', 'guards', 'lint.json');
  if (args.includes('--write')) writeFileSync(file, `${JSON.stringify(now, null, 2)}\n`);
  const baseline = existsSync(file) ? read(file) : {};
  const at = args.indexOf('--base');
  const exists = (path) => existsSync(join(root, path));
  const diff = [
    ...differences(now, baseline),
    ...(at === -1 ? [] : aboveBase(now, read(args[at + 1]), newRule(configTexts(args)))),
    ...paths.flatMap((p, i) => gone(dirname(p), files[i], exists)),
    ...oxlintSuppressed(read(join(root, '.oxlintrc.json')), now),
  ];
  console.log(`lint: ${sum(now)} suppressed in ${paths.length} packages, baseline ${sum(baseline)}`);
  for (const line of diff) console.log(`  ${line}`);
  if (diff.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
