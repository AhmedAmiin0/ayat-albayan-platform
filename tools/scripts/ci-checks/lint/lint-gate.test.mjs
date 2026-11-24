import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aboveBase, againstBase, gone, oxlintSuppressed, totals } from './lint-gate.mjs';

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
  // Suppressions raised: above the base branch's own totals.
  const raised = { complexity: 7, eqeqeq: 1, 'max-depth': 2 };
  assert.deepEqual(aboveBase(raised, base), [
    'above the base branch: complexity 5 -> 7 (fix the new violations)',
    'above the base branch: eqeqeq 0 -> 1 (fix the new violations)',
  ]);
});

test('gone: an entry whose file was deleted or moved fails (ESLint never lints that file)', () => {
  const byFile = { 'src/a.ts': { complexity: { count: 1 } }, 'src/old.ts': { 'max-depth': { count: 2 } } };
  const exists = (path) => path === 'apps/staff-web/src/a.ts';
  assert.deepEqual(gone('apps/staff-web', byFile, exists), ['gone: apps/staff-web/src/old.ts (eslint . --prune-suppressions)']);
  assert.deepEqual(gone('apps/staff-web', {}, exists), []);
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

test('aboveBase: a rule the PR turns on or tightens has no baseline: its violations fail', () => {
  const now = { complexity: 900, 'max-len': 1, eqeqeq: 1 };
  assert.deepEqual(aboveBase(now, { complexity: 300, 'max-len': 1 }), [
    'above the base branch: complexity 300 -> 900 (fix the new violations)',
    'above the base branch: eqeqeq 0 -> 1 (fix the new violations)',
  ]);
  assert.equal(aboveBase.length, 2);
});

const side = (files) => ({ paths: Object.keys(files), files: Object.values(files) });

test('againstBase: eslint and oxlint files per rule total, per file and per workspace', () => {
  const api = { 'src/a.ts': { complexity: { count: 2 } } };
  const base = { eslint: side({ 'apps/api/eslint-suppressions.json': api }), oxlint: side({}) };
  const head = {
    eslint: side({ 'apps/api/eslint-suppressions.json': { 'src/b.ts': { complexity: { count: 1 } } } }),
    oxlint: side({ 'apps/api/oxlint-suppressions.json': api }),
  };
  assert.deepEqual(againstBase({ head, base, move: (path) => path }), [
    'above the base branch: apps/api/src/b.ts complexity 0 -> 1 (fix it, never suppress it)',
    'oxlint above the base branch: complexity 0 -> 2 (fix the new violations)',
    'oxlint above the base branch: apps/api/src/a.ts complexity 0 -> 2 (fix it, never suppress it)',
    'oxlint new suppressions file: apps/api/oxlint-suppressions.json (fix the violations instead)',
  ]);
  assert.deepEqual(againstBase({ head: base, base, move: (path) => path }), []);
});
