import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FloatingUnit } from '../scan/scan.types.ts';
import { planUnit, testName } from './targets.ts';

const DIR = 'apps/web/src/pane';

const unit = (over: Partial<FloatingUnit>): FloatingUnit => ({
  dir: DIR,
  name: 'ThreadPane',
  files: [],
  tests: [],
  action: 'fold',
  ...over,
});

test('testName drops the unit prefix; <Unit>.test.tsx keeps its name', () => {
  assert.equal(testName('ThreadPane', 'ThreadPane.chat.test.tsx'), 'chat.test.tsx');
  assert.equal(testName('ThreadPane', 'ThreadPane.privacy.en.test.tsx'), 'privacy.en.test.tsx');
  assert.equal(testName('ThreadPane', 'ThreadPane.test.tsx'), 'ThreadPane.test.tsx');
  assert.equal(testName('ThreadPane', 'ThreadPane.spec.ts'), 'ThreadPane.spec.ts');
  assert.equal(testName('ThreadPane', 'ThreadPane.types.test.ts'), 'types.test.ts');
});

test('fold: code into <Unit>/, 2+ tests into <Unit>/tests/ with their snapshots', () => {
  const tests = ['ThreadPane.chat.test.tsx', 'ThreadPane.test.tsx'];
  const u = unit({ files: ['ThreadPane.tsx', ...tests], tests });
  const snap = `${DIR}/__snapshots__/ThreadPane.chat.test.tsx.snap`;
  const plan = planUnit(u, new Set([snap]));
  assert.equal(plan.home, `${DIR}/ThreadPane`);
  assert.deepEqual(plan.moves, [
    { from: `${DIR}/ThreadPane.tsx`, to: `${DIR}/ThreadPane/ThreadPane.tsx` },
    { from: `${DIR}/ThreadPane.chat.test.tsx`, to: `${DIR}/ThreadPane/tests/chat.test.tsx` },
    { from: snap, to: `${DIR}/ThreadPane/tests/__snapshots__/chat.test.tsx.snap` },
    { from: `${DIR}/ThreadPane.test.tsx`, to: `${DIR}/ThreadPane/tests/ThreadPane.test.tsx` },
  ]);
});

test('fold with one test keeps it beside the code', () => {
  const u = unit({ files: ['ThreadPane.tsx', 'ThreadPane.types.ts', 'ThreadPane.test.tsx'] });
  const plan = planUnit({ ...u, tests: ['ThreadPane.test.tsx'] }, new Set());
  assert.deepEqual(
    plan.moves.map((m) => m.to),
    ['ThreadPane.tsx', 'ThreadPane.types.ts', 'ThreadPane.test.tsx'].map(
      (n) => `${DIR}/ThreadPane/${n}`,
    ),
  );
});

test('tests: only the tests move, into tests/ of the folder they are in', () => {
  const tests = ['usage.stop.test.ts', 'usage.test.ts'];
  const u = unit({
    dir: 'p/usage',
    name: 'usage',
    files: ['usage.ts', ...tests],
    tests,
    action: 'tests',
  });
  assert.deepEqual(planUnit(u, new Set()), {
    unit: u,
    home: 'p/usage',
    moves: [
      { from: 'p/usage/usage.stop.test.ts', to: 'p/usage/tests/stop.test.ts' },
      { from: 'p/usage/usage.test.ts', to: 'p/usage/tests/usage.test.ts' },
    ],
  });
});
