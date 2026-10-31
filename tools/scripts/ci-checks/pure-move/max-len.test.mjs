import assert from 'node:assert/strict';
import { test } from 'node:test';
import { suppressionsMoved } from './baselines.mjs';

// docs/32 D2 + R12: a rename (`XQueries` → `XRepo`) or an `@/` rewrite shortens lines, so a move
// may lower or drop max-len entries; it may never raise, add or zero them.
const RULE = 'max-len';
const FILE = 'apps/api/eslint-suppressions.json';
const MOVES = [['apps/api/src/t/t.queries.ts', 'apps/api/src/t/t.repo.ts']];
const base = {
  'src/t/t.queries.ts': { [RULE]: { count: 2 } },
  'src/t/t.counts.test.ts': { [RULE]: { count: 2 }, 'max-lines': { count: 1 } },
};
const texts = (head) => ({ base: JSON.stringify(base), head: JSON.stringify(head) });
const check = (head) => suppressionsMoved(FILE, texts(head), MOVES);
const repo = { 'src/t/t.repo.ts': { [RULE]: { count: 2 } } };

test('a move may lower or drop max-len entries', () => {
  const lower = { [RULE]: { count: 1 }, 'max-lines': { count: 1 } };
  assert.equal(check({ ...repo, 'src/t/t.counts.test.ts': lower }), true);
  assert.equal(check({ ...repo, 'src/t/t.counts.test.ts': { 'max-lines': { count: 1 } } }), true, 'dropped');
  assert.equal(check({ 'src/t/t.counts.test.ts': base['src/t/t.counts.test.ts'] }), true, 'moved file drops it');
});

test('max-len may not rise, appear or reach 0, and other rules stay', () => {
  const tests = base['src/t/t.counts.test.ts'];
  assert.equal(check({ 'src/t/t.repo.ts': { [RULE]: { count: 3 } }, 'src/t/t.counts.test.ts': tests }), false, 'raised');
  assert.equal(check({ ...repo, 'src/t/t.counts.test.ts': tests, 'src/u.ts': { [RULE]: { count: 1 } } }), false, 'added');
  assert.equal(check({ ...repo, 'src/t/t.counts.test.ts': { [RULE]: { count: 0 }, 'max-lines': { count: 1 } } }), false, 'count 0');
  assert.equal(check({ ...repo, 'src/t/t.counts.test.ts': { [RULE]: { count: 2 } } }), false, 'max-lines dropped');
});
