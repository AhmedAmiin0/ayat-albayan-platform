import assert from 'node:assert/strict';
import { test } from 'node:test';
import { differences, totals } from './lint-gate.mjs';

test('totals sums each rule over every file of every package, rules sorted', () => {
  const api = { 'src/a.ts': { complexity: { count: 2 }, 'ab/module-boundaries': { count: 1 } } };
  const web = { 'src/b.tsx': { complexity: { count: 3 } }, 'src/c.tsx': { 'no-restricted-syntax': { count: 4 } } };
  const out = totals([api, web]);
  assert.deepEqual(out, { 'ab/module-boundaries': 1, complexity: 5, 'no-restricted-syntax': 4 });
  assert.deepEqual(Object.keys(out), ['ab/module-boundaries', 'complexity', 'no-restricted-syntax']);
  assert.deepEqual(totals([]), {});
});

test('differences: equal totals pass; a grown or new rule and a shrunk or gone one each fail', () => {
  const baseline = { complexity: 5, 'max-depth': 2, 'no-console': 1 };
  assert.deepEqual(differences({ ...baseline }, baseline), []);
  assert.deepEqual(differences({ complexity: 6, 'max-depth': 1, eqeqeq: 1 }, baseline), [
    'grew: complexity 5 -> 6',
    'grew: eqeqeq 0 -> 1',
    'shrank: max-depth 2 -> 1 (pnpm guard:lint -- --write)',
    'shrank: no-console 1 -> 0 (pnpm guard:lint -- --write)',
  ]);
});
