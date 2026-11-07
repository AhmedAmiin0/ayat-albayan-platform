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
  const eslint = [f('a.ts', 36, 'complexity'), f('b.ts', 3, 'ab/no-if-chains')];
  const oxlint = [f('a.ts', 38, 'complexity'), f('c.ts', 3, 'ab/no-if-chains')];
  const { missing, moved, extra } = compareFindings(eslint, oxlint);
  assert.deepEqual(moved, [{ eslint: eslint[0], oxlint: oxlint[0] }]);
  assert.deepEqual([missing, extra], [[eslint[1]], [oxlint[1]]]);
});

test('failures: a miss outside gaps.json fails; a gap with no miss is stale', () => {
  const missing = [f('a.ts', 1, 'x'), f('b.ts', 1, 'x'), f('a.ts', 2, 'gap')];
  assert.deepEqual(perRule(missing), { gap: 1, x: 2 });
  assert.deepEqual(failures(missing, { gap: 'why', fixed: 'why' }), [
    'missing: x ×2 (Oxlint does not report what ESLint does)',
    'stale gap: fixed misses nothing now (remove it from gaps.json)',
  ]);
  assert.deepEqual(failures([], {}), []);
});
