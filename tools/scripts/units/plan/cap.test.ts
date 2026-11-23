import assert from 'node:assert/strict';
import { test } from 'node:test';
import { capReason } from './cap.ts';

const many = (dir: string, n: number, name = (i: number): string => `f${i}.ts`): string[] =>
  Array.from({ length: n }, (_, i) => `${dir}/${name(i)}`);

test('a move within the cap passes; tests never count', () => {
  const paths = [...many('d', 3), ...many('d', 20, (i) => `t${i}.test.ts`)];
  assert.equal(capReason(paths, [{ from: 'd/f0.ts', to: 'd/F/f0.ts' }]), undefined);
});

test('a folder that would hold a 13th sub-folder is reported', () => {
  const paths = many('d', 12, (i) => `s${i}/x.ts`).concat(['d/A.ts']);
  const reason = capReason(paths, [{ from: 'd/A.ts', to: 'd/A/A.ts' }]);
  assert.equal(reason, 'd would hold 13 sub-folders (max 12)');
});

test('a unit folder of 13 code files is reported', () => {
  const paths = many('d', 13, (i) => `A.r${i}.ts`);
  const moves = paths.map((from) => ({ from, to: from.replace('d/', 'd/A/') }));
  assert.equal(capReason(paths, moves, ['d/A/index.ts']), 'd/A would hold 14 code files (max 12)');
});

test('a folder already over the cap may not grow, only shrink', () => {
  const paths = [...many('d', 13, (i) => `s${i}/x.ts`), 'd/A.ts', 'd/s0/A.ts'];
  assert.equal(capReason(paths, [{ from: 'd/A.ts', to: 'd/s0/B.ts' }]), undefined);
});
