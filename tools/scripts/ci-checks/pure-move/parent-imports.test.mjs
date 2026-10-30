import assert from 'node:assert/strict';
import { test } from 'node:test';
import { suppressionsMoved } from './baselines.mjs';

const RULE = 'ab/no-parent-imports';
const FILE = 'apps/web/eslint-suppressions.json';
const MOVES = [['apps/web/src/a/x.ts', 'apps/web/src/b/x.ts']];
const base = {
  'src/a/x.ts': { [RULE]: { count: 3 }, 'max-len': { count: 1 } },
  'src/c/y.ts': { [RULE]: { count: 2 } },
};
const texts = (head) => ({ base: JSON.stringify(base), head: JSON.stringify(head) });
const check = (head) => suppressionsMoved(FILE, texts(head), MOVES);

test('a move may lower or drop the no-parent-imports entries (docs/32 R12), moved files included', () => {
  assert.equal(check({ 'src/b/x.ts': { [RULE]: { count: 1 }, 'max-len': { count: 1 } }, 'src/c/y.ts': { [RULE]: { count: 2 } } }), true);
  assert.equal(check({ 'src/b/x.ts': { 'max-len': { count: 1 } } }), true, 'both rewritten: entry and file key go');
});

test('it may not raise or add one, nor touch another rule', () => {
  const moved = { 'src/b/x.ts': { [RULE]: { count: 3 }, 'max-len': { count: 1 } } };
  assert.equal(check({ ...moved, 'src/c/y.ts': { [RULE]: { count: 3 } } }), false, 'raised');
  assert.equal(check({ ...moved, 'src/c/y.ts': { [RULE]: { count: 2 } }, 'src/d.ts': { [RULE]: { count: 1 } } }), false, 'added');
  assert.equal(check({ 'src/b/x.ts': { [RULE]: { count: 3 } }, 'src/c/y.ts': { [RULE]: { count: 2 } } }), false, 'max-len dropped');
  assert.equal(check({ 'src/b/x.ts': { [RULE]: { count: 0 }, 'max-len': { count: 1 } }, 'src/c/y.ts': { [RULE]: { count: 2 } } }), false, 'count 0');
  assert.equal(check({ 'src/a/x.ts': base['src/a/x.ts'], 'src/c/y.ts': { [RULE]: { count: 2 } } }), false, 'old key kept');
});
