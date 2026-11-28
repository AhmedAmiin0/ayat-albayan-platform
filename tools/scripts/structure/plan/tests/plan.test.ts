import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planMoves } from '../plan.ts';

const move = (from: string, to: string) => ({ from, to, layer: 'staff-web' as const });
const W = 'apps/staff-web/src';

test('moves every file of the tree by its most specific rule', () => {
  const files = [`${W}/a/x.ts`, `${W}/a/b/y.ts`, `${W}/keep.ts`];
  const plan = planMoves(files, {
    moves: [move(`${W}/a/`, `${W}/features/d/a/`), move(`${W}/a/b/`, `${W}/features/d/b/`)],
    drops: [],
  });
  assert.deepEqual(plan.pairs, [
    [`${W}/a/b/y.ts`, `${W}/features/d/b/y.ts`],
    [`${W}/a/x.ts`, `${W}/features/d/a/x.ts`],
  ]);
  assert.deepEqual(plan.problems, []);
});

test('fails on a rule that matches nothing', () => {
  const plan = planMoves([`${W}/a/x.ts`], { moves: [move(`${W}/gone/`, `${W}/f/`)], drops: [] });
  assert.deepEqual(plan.problems, [`missing source: ${W}/gone/ (move 0)`]);
});

test('fails on a rule whose every file a more specific rule takes', () => {
  const plan = planMoves([`${W}/a/b/x.ts`], {
    moves: [move(`${W}/a/`, `${W}/f/`), move(`${W}/a/b/`, `${W}/g/`)],
    drops: [],
  });
  assert.deepEqual(plan.problems, [`shadowed: ${W}/a/ takes no file (move 0)`]);
});

test('fails on two sources moving to one target', () => {
  const files = [`${W}/a/x.ts`, `${W}/b/x.ts`];
  const plan = planMoves(files, {
    moves: [move(`${W}/a/`, `${W}/f/`), move(`${W}/b/`, `${W}/f/`)],
    drops: [],
  });
  assert.deepEqual(plan.problems, [
    `two sources on one target: ${W}/f/x.ts (${W}/a/x.ts, ${W}/b/x.ts)`,
  ]);
});

test('fails on a target that a staying file holds', () => {
  const plan = planMoves([`${W}/a/x.ts`, `${W}/f/x.ts`], {
    moves: [move(`${W}/a/`, `${W}/f/`)],
    drops: [],
  });
  assert.deepEqual(plan.problems, [`target exists: ${W}/f/x.ts (from ${W}/a/x.ts)`]);
});

test('a target held by a file that moves away is fine (swap through a temporary name)', () => {
  const plan = planMoves([`${W}/n/x.ts`, `${W}/n/bell/x.ts`], {
    moves: [move(`${W}/n/x.ts`, `${W}/n/bell/`), move(`${W}/n/bell/`, `${W}/old-bell/`)],
    drops: [],
  });
  assert.deepEqual(plan.problems, []);
});

test('fails on a file two equal rules take', () => {
  const plan = planMoves([`${W}/a/foo.ts`], {
    moves: [move(`${W}/a/foo.*`, `${W}/f/`), move(`${W}/a/f*`, `${W}/g/`)],
    drops: [],
  });
  assert.deepEqual(plan.problems, [`two rules take ${W}/a/foo.ts: ${W}/a/foo.*, ${W}/a/f*`]);
});

test('fails on a move across workspaces and on a moved route file', () => {
  const files = ['apps/staff-web/src/a/x.ts', 'apps/staff-web/src/routes/r.tsx'];
  const plan = planMoves(files, {
    moves: [
      move('apps/staff-web/src/a/', 'apps/family-web/src/a/'),
      move('apps/staff-web/src/routes/r.tsx', 'apps/staff-web/src/features/r.tsx'),
    ],
    drops: [],
  });
  assert.deepEqual(plan.problems, [
    'across workspaces: apps/staff-web/src/a/x.ts → apps/family-web/src/a/x.ts',
    'route file moved: apps/staff-web/src/routes/r.tsx',
  ]);
});

test('a dropped barrel leaves the plan and must exist', () => {
  const files = [`${W}/a/index.ts`, `${W}/a/x.ts`];
  const drop = (path: string) => ({ drop: path, layer: 'staff-web' as const, why: 'facade' });
  const plan = planMoves(files, {
    moves: [move(`${W}/a/`, `${W}/f/`)],
    drops: [drop(`${W}/a/index.ts`), drop(`${W}/b/index.ts`)],
  });
  assert.deepEqual(plan.pairs, [[`${W}/a/x.ts`, `${W}/f/x.ts`]]);
  assert.deepEqual(plan.drops, [`${W}/a/index.ts`]);
  assert.deepEqual(plan.problems, [`missing barrel: ${W}/b/index.ts`]);
});
