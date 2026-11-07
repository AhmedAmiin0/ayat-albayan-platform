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
