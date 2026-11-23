import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareUnits, unitCounts } from './guard.ts';

const three = (dir: string, name: string): string[] =>
  [`${name}.tsx`, `${name}.a.test.tsx`, `${name}.b.test.tsx`].map((n) => `${dir}/${n}`);

test('unitCounts: floating units per folder, excluded trees left out', () => {
  const paths = [
    ...three('apps/w/src/a', 'A'),
    ...three('apps/w/src/a', 'B'),
    ...three('apps/api/src/modules/m', 'C'),
  ];
  assert.deepEqual(unitCounts(paths), { 'apps/w/src/a': 2 });
});

test('compareUnits: a folder that gains a floating unit fails; fewer or gone passes', () => {
  const result = compareUnits({ a: 2, b: 1, d: 1 }, { a: 1, b: 1, c: 3 });
  assert.deepEqual(result, {
    grew: ['a: 2 floating units (baseline 1)', 'd: 1 floating units (baseline 0)'],
    shrank: ['c: 0 floating units (baseline 3)'],
  });
});
