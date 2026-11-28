import assert from 'node:assert/strict';
import { test } from 'node:test';
import { capProblems } from '../files/cap.ts';
import { countUnder } from '../files/folders.ts';
import { nestingProblems } from '../files/nesting.ts';

const many = (dir: string, n: number, name = (i: number) => `f${i}.ts`) =>
  Array.from({ length: n }, (_, i) => `${dir}/${name(i)}`);

test('counts code files without tests and sub-folders without __snapshots__', () => {
  const files = [
    'r/a/x.ts',
    'r/a/x.test.ts',
    'r/a/b/y.tsx',
    'r/a/__snapshots__/x.snap',
    'r/a/c/d/z.md',
  ];
  const counts = countUnder(files, 'r');
  assert.deepEqual(counts.get('r/a'), { files: 1, dirs: 2 });
  assert.deepEqual(counts.get('r/a/c'), { files: 0, dirs: 1 });
});

test('a folder over 12 code files or 12 sub-folders fails unless allow-listed at that size', () => {
  const files = [...many('r/a', 13), ...many('r/b', 13, (i) => `s${i}/x.ts`)];
  assert.deepEqual(capProblems(files, { roots: ['r'], allow: {} }), [
    'over the folder cap: r/a has 13 code files, 0 folders',
    'over the folder cap: r/b has 0 code files, 13 folders',
  ]);
  const allow = { 'r/a': { files: 13, dirs: 0 }, 'r/b': { files: 0, dirs: 12 } };
  assert.deepEqual(capProblems(files, { roots: ['r'], allow }), [
    'over the folder cap: r/b has 0 code files, 13 folders',
  ]);
});

test('twelve is within the cap', () => {
  assert.deepEqual(capProblems(many('r/a', 12), { roots: ['r'], allow: {} }), []);
});

test('reports a folder the moves nest inside its namesake', () => {
  const before = ['r/money/shared/x.ts', 'r/keep/keep/y.ts'];
  const after = ['r/pay/shared/shared/x.ts', 'r/keep/keep/y.ts'];
  assert.deepEqual(nestingProblems(before, after), ['double-nested folder: r/pay/shared/shared']);
});
