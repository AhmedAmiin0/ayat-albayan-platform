import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aboveBase, gone, newRule, oxlintSuppressed, tightenedRule, totals } from './lint-gate.mjs';

test('totals sums each rule over every file of every package, rules sorted', () => {
  const api = { 'src/a.ts': { complexity: { count: 2 }, 'ab/module-boundaries': { count: 1 } } };
  const web = { 'src/b.tsx': { complexity: { count: 3 } }, 'src/c.tsx': { 'no-restricted-syntax': { count: 4 } } };
  const out = totals([api, web]);
  assert.deepEqual(out, { 'ab/module-boundaries': 1, complexity: 5, 'no-restricted-syntax': 4 });
  assert.deepEqual(Object.keys(out), ['ab/module-boundaries', 'complexity', 'no-restricted-syntax']);
  assert.deepEqual(totals([]), {});
});

test('aboveBase: equal or below the base branch passes with nothing to edit; above it fails', () => {
  const base = { complexity: 5, 'max-depth': 2, 'no-console': 1 };
  assert.deepEqual(aboveBase({ ...base }, base), []);
  // Fixed violations (a lower total, a rule gone): no baseline to lower, the PR only prunes.
  assert.deepEqual(aboveBase({ complexity: 5, 'max-depth': 1 }, base), []);
  // `eslint . --suppress-all` raised the suppressions: above the base branch's own totals.
  const raised = { complexity: 7, eqeqeq: 1, 'max-depth': 2 };
  assert.deepEqual(aboveBase(raised, base), [
    'above the base branch: complexity 5 -> 7 (fix the new violations)',
    'above the base branch: eqeqeq 0 -> 1 (fix the new violations)',
  ]);
});

test('gone: an entry whose file was deleted or moved fails (ESLint never lints that file)', () => {
  const byFile = { 'src/a.ts': { complexity: { count: 1 } }, 'src/old.ts': { 'max-depth': { count: 2 } } };
  const exists = (path) => path === 'apps/web/src/a.ts';
  assert.deepEqual(gone('apps/web', byFile, exists), ['gone: apps/web/src/old.ts (eslint . --prune-suppressions)']);
  assert.deepEqual(gone('apps/web', {}, exists), []);
});

test('oxlintSuppressed: a rule oxlint runs may have no suppressed violation, whatever its prefix', () => {
  const now = { '@typescript-eslint/max-params': 2, complexity: 240, 'no-regex-spaces': 2 };
  const rc = {
    rules: { 'typescript/no-explicit-any': 'error', 'max-params': 'error' },
    overrides: [{ rules: { 'eslint/no-regex-spaces': 'error' } }],
  };
  assert.deepEqual(oxlintSuppressed(rc, now), [
    'oxlint runs @typescript-eslint/max-params, which has 2 suppressed: keep it in ESLint',
    'oxlint runs no-regex-spaces, which has 2 suppressed: keep it in ESLint',
  ]);
  assert.deepEqual(oxlintSuppressed({ rules: { eqeqeq: 'error' } }, now), []);
  assert.deepEqual(oxlintSuppressed({}, now), []);
});

test('aboveBase: a rule the PR turns on gets its one-time baseline; a known or preset rule does not', () => {
  const configs = { base: "complexity: ['error', 10]", head: "complexity: 10, 'max-len': ['error'], \"ab/x\": 'error'" };
  const isNew = newRule(configs);
  const now = { complexity: 3, 'max-len': 900, 'ab/x': 2, 'no-unsafe-call': 4 };
  assert.deepEqual(aboveBase(now, { complexity: 3 }, { isNew }), [
    'above the base branch: no-unsafe-call 0 -> 4 (fix the new violations)',
  ]);
  // Named on both sides (already configured): its base total, here 0, still holds.
  const both = newRule({ base: "'max-len': 'off'", head: configs.head });
  assert.equal(aboveBase({ 'max-len': 1 }, {}, { isNew: both }).length, 1);
  // An unquoted key in the base (`complexity: …`) is named too.
  const unquoted = newRule({ base: '{ complexity: 10 }', head: "'complexity'" });
  assert.equal(aboveBase({ complexity: 1 }, {}, { isNew: unquoted }).length, 1);
  // Once in the base branch's suppressions, a new rule only shrinks.
  assert.equal(aboveBase({ 'max-len': 901 }, { 'max-len': 900 }, { isNew }).length, 1);
});

test('aboveBase: a rule whose every limit the PR lowers is re-baselined once; a raised one is not', () => {
  const base = "complexity: ['error', 10],\n  'max-depth': ['error', 3], 'max-lines': ['error', { max: 150 }]";
  const head = "complexity: ['error', { max: 8, variant: 'classic' }],\n  'max-depth': ['error', 2],\n"
    + "{ files: ['**/*.ts'], rules: { complexity: ['error', { max: 6 }] } }, 'max-lines': ['error', { max: 150 }]";
  const isTightened = tightenedRule({ base, head });
  const now = { complexity: 900, 'max-depth': 40, 'max-lines': 3, eqeqeq: 1 };
  const old = { complexity: 300, 'max-depth': 11, 'max-lines': 2 };
  assert.deepEqual(aboveBase(now, old, { isTightened }), [
    'above the base branch: max-lines 2 -> 3 (fix the new violations)',
    'above the base branch: eqeqeq 0 -> 1 (fix the new violations)',
  ]);
  // One block above the base limit (or a rule only one side limits): no baseline.
  assert.equal(tightenedRule({ base, head: `${head} complexity: ['error', 12]` })('complexity'), false);
  assert.equal(tightenedRule({ base: '', head })('max-depth'), false);
  // A numeric severity counts as a limit too, so it never reads as tightened (fails closed).
  assert.equal(tightenedRule({ base: 'complexity: [2, 10]', head: 'complexity: [2, 8]' })('complexity'), false);
  // A longer name that ends in the rule's name is another rule.
  assert.equal(tightenedRule({ base, head: "'ab/max-depth': ['error', 1]" })('max-depth'), false);
});
