// Lint ratchet (docs/31a §5.1): the violations that predate a rule sit in each package's
// eslint-suppressions.json (`eslint . --suppress-all`). On a PR, CI checks the base branch out
// beside it (GUARD_BASE): no per-rule total, summed over every package, may rise above the base's
// own sum (a count raised by hand; a rule the PR turns on gets its one-time baseline, newRule).
// The totals are derived from both trees, never stored, so a PR that fixes violations only prunes
// its suppressions and no two PRs conflict on a totals file. Per rule over the whole repo, not per
// file: ESLint itself enforces the per-file counts. Also fails on an entry whose file is gone
// (ESLint lints only files that exist, so it never reports those), and when the root .oxlintrc.json
// (the first lint pass, no bulk suppressions) runs a rule that has suppressed violations.
// Usage: [GUARD_BASE=<base checkout>] node tools/scripts/ci-checks/lint/lint-gate.mjs
//   [--configs <base ESLint config sources> <head ones>] (a rule the PR turns on: newRule)
import { existsSync, globSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIRS = ['apps/*', 'packages/*', 'tools/*', 'e2e', 'docs/design/brand/tools'];
const FILES = DIRS.map((dir) => `${dir}/eslint-suppressions.json`);

/** Per-rule totals (sorted by rule) of suppressions files `{ file: { rule: { count } } }`. */
export function totals(files) {
  const out = {};
  const entries = files.flatMap((byFile) =>
    Object.values(byFile).flatMap((rules) => Object.entries(rules)),
  );
  for (const [rule, { count }] of entries) out[rule] = (out[rule] ?? 0) + count;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)));
}

/**
 * On a PR: one line per rule whose total is above the base branch's; equal or below passes (a rule
 * the base lacks counts from 0, unless `isNew(rule)`; a rule whose limit the PR lowers,
 * `isTightened(rule)`: their one-time baseline, docs/32 §1).
 */
export function aboveBase(now, base, baseline = {}) {
  const { isNew = never, isTightened = never } = baseline;
  return Object.keys(now)
    .filter((rule) => now[rule] > (base[rule] ?? 0))
    .filter((rule) => !isTightened(rule))
    .filter((rule) => Object.hasOwn(base, rule) || !isNew(rule))
    .map((rule) => `above the base branch: ${rule} ${base[rule] ?? 0} -> ${now[rule]} (fix the new violations)`);
}

// Quoted anywhere (`'max-len': …`, `"ab/x"`), or an unquoted key (`complexity: 10`).
const named = (text, rule) =>
  text.includes(`'${rule}'`) ||
  text.includes(`"${rule}"`) ||
  (/^[\w-]+$/.test(rule) && new RegExp(`(^|[\\s{,])${rule}\\s*:`, 'm').test(text));

/**
 * A rule this PR turns on: its quoted name is in the head's ESLint config sources and in none of
 * the base's. A preset rule that no config names keeps its base total until a reviewed config edit
 * names it.
 */
export const newRule = (configs) => (rule) =>
  named(configs.head, rule) && !named(configs.base, rule);

/** Entries of the suppressions file in package folder `dir` whose file is gone (deleted, moved). */
export function gone(dir, byFile, exists) {
  return Object.keys(byFile)
    .filter((key) => !exists(`${dir}/${key}`))
    .map((key) => `gone: ${dir}/${key} (eslint . --prune-suppressions)`);
}

// The numbers in each `rule: [ … ]` entry of a config source (`complexity: ['error', { max: 8 }]`).
const limits = (text, rule) => {
  const key = `(?:'${rule}'|"${rule}"|(?<![\\w/-])${rule})`;
  const entries = text.matchAll(new RegExp(`${key}\\s*:\\s*\\[([^\\]]*)\\]`, 'g'));
  return [...entries].flatMap((m) => [...m[1].matchAll(/\b\d+\b/g)].map(Number));
};

/**
 * A rule whose numeric limit this PR lowers (docs/36 D4: complexity 10 -> 8/6, max-depth 3 -> 2):
 * every limit the head's config sources give it is below every one the base's give it (a later
 * 8/6 -> 7/5 step does not qualify: 7 is not below 6; that one needs a reviewed baseline).
 */
export const tightenedRule = (configs) => (rule) => {
  const [head, base] = [limits(configs.head, rule), limits(configs.base, rule)];
  return head.length > 0 && base.length > 0 && Math.max(...head) < Math.min(...base);
};

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

/** `--configs <base> <head>`: both sides' ESLint config sources (none given: no new rule). */
function configTexts(args) {
  const at = args.indexOf('--configs');
  if (at === -1) return { base: '', head: '' };
  return { base: readFileSync(args[at + 1], 'utf8'), head: readFileSync(args[at + 2], 'utf8') };
}

const never = () => false;
const baselines = (configs) => ({ isNew: newRule(configs), isTightened: tightenedRule(configs) });
const sum = (byRule) => Object.values(byRule).reduce((a, b) => a + b, 0);
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));

/** The suppressions files of the tree at `dir`: their paths and contents. */
function suppressions(dir) {
  const paths = globSync(FILES, { cwd: dir }).sort();
  return { paths, files: paths.map((p) => read(join(dir, p))) };
}

function main(args) {
  const root = fileURLToPath(new URL('../../../..', import.meta.url));
  const { paths, files } = suppressions(root);
  const now = totals(files);
  const dir = process.env.GUARD_BASE;
  const base = dir ? totals(suppressions(dir).files) : null;
  const exists = (path) => existsSync(join(root, path));
  const diff = [
    ...(base ? aboveBase(now, base, baselines(configTexts(args))) : []),
    ...paths.flatMap((p, i) => gone(dirname(p), files[i], exists)),
    ...oxlintSuppressed(read(join(root, '.oxlintrc.json')), now),
  ];
  const against = base ? `the base branch ${sum(base)}` : 'no base branch given (GUARD_BASE)';
  console.log(`lint: ${sum(now)} suppressed in ${paths.length} packages, ${against}`);
  for (const line of diff) console.log(`  ${line}`);
  if (diff.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
