import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareFindings, failures, perRule } from './compare.mjs';

const f = (file, line, rule) => ({ file, line, rule });

test('compareFindings: same file + line + rule matches, counted as a multiset', () => {
  const eslint = [
    f('a.ts', 1, 'complexity'),
    f('a.ts', 1, 'complexity'),
    f('a.ts', 2, 'max-depth'),
  ];
  const oxlint = [f('a.ts', 2, 'max-depth'), f('a.ts', 1, 'complexity')];
  const { missing, moved, extra } = compareFindings(eslint, oxlint);
  assert.deepEqual([missing, moved, extra], [[f('a.ts', 1, 'complexity')], [], []]);
});

test('compareFindings: another line of the same file and rule is moved; else missing / extra', () => {
  const eslint = [f('a.ts', 36, 'complexity'), f('b.ts', 3, 'ab/no-if-chains'), f('a.ts', 90, 'x')];
  const oxlint = [f('a.ts', 38, 'complexity'), f('c.ts', 3, 'ab/no-if-chains'), f('a.ts', 10, 'x')];
  const { missing, moved, extra } = compareFindings(eslint, oxlint);
  assert.deepEqual(moved, [{ eslint: eslint[0], oxlint: oxlint[0] }]);
  // An extra far away in the same file (80 lines) does not hide a miss.
  assert.deepEqual([missing, extra], [[eslint[1], eslint[2]], [oxlint[1], oxlint[2]]]);
});

test('failures: misses above a gap\'s count (0 unlisted) fail; a gap above its misses is stale', () => {
  const missing = [f('a.ts', 1, 'x'), f('b.ts', 1, 'x'), f('a.ts', 2, 'gap'), f('a.ts', 3, 'gap')];
  assert.deepEqual(perRule(missing), { gap: 2, x: 2 });
  const gap = (missed) => ({ missed, why: 'tsgolint' });
  assert.deepEqual(failures(missing, { gap: gap(2), fixed: gap(1) }), [
    'missing: x ×2, allowed 0 (Oxlint misses it)',
    'stale gap: fixed misses 0 < 1 (gaps.json)',
  ]);
  assert.deepEqual(failures(missing, { gap: gap(1), x: gap(2) }), [
    'missing: gap ×2, allowed 1 (Oxlint misses it)',
  ]);
  assert.deepEqual(failures(missing, { gap: gap(3), x: gap(2) }), [
    'stale gap: gap misses 2 < 3 (gaps.json)',
  ]);
});

test('failures under a scope: a package holds its share of a gap, the other row the rest', () => {
  const gap = { missed: 5, why: 'tsgolint', scopes: { 'apps/api': 2 } };
  const miss = (n) => Array.from({ length: n }, (_, i) => f(`a${String(i)}.ts`, 1, 'gap'));
  assert.deepEqual(failures(miss(2), { gap }, 'apps/api'), []);
  assert.deepEqual(failures(miss(3), { gap }, '!apps/api'), []);
  assert.deepEqual(failures(miss(5), { gap }), [], 'no scope: the whole count');
  assert.deepEqual(failures(miss(3), { gap }, 'apps/api'), [
    'missing: gap ×3, allowed 2 (Oxlint misses it)',
  ]);
  assert.deepEqual(failures(miss(2), { gap }, '!apps/api'), [
    'stale gap: gap misses 2 < 3 (gaps.json)',
  ]);
  // No share listed: the package is allowed none, the other row all of it.
  const plain = { plain: { missed: 4, why: 'tsgolint' } };
  const as = (rule, n) => miss(n).map((x) => ({ ...x, rule }));
  assert.deepEqual(failures(as('plain', 1), plain, 'apps/api'), [
    'missing: plain ×1, allowed 0 (Oxlint misses it)',
  ]);
  assert.deepEqual(failures(as('plain', 4), plain, '!apps/api'), []);
});
