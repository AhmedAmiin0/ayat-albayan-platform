import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FolderPlan } from './plan.types.ts';
import { folderLines, summaryLines, treeLines } from './report.ts';

const unit = (dir: string, name: string, files: string[]): FolderPlan['units'][number] => ({
  unit: { dir, name, files, tests: files.filter((f) => f.includes('.test.')), action: 'fold' },
  home: `${dir}/${name}`,
  moves: files.map((f) => ({ from: `${dir}/${f}`, to: `${dir}/${name}/${f}` })),
});

const PLANS: FolderPlan[] = [
  { dir: 'apps/w/src/a', units: [unit('apps/w/src/a', 'A', ['A.tsx', 'A.x.ts', 'A.y.ts'])] },
  {
    dir: 'apps/w/src/routes/b',
    units: [unit('apps/w/src/routes/b', 'B', ['B.tsx', 'B.types.ts', 'B.test.tsx'])],
    skip: { kind: 'excluded', why: 'file-based route tree' },
  },
  {
    dir: 'packages/p/src/c',
    units: [unit('packages/p/src/c', 'C', ['C.ts', 'C.a.ts', 'C.b.ts'])],
    skip: { kind: 'cap', why: 'packages/p/src/c would hold 13 sub-folders (max 12)' },
  },
];

test('summaryLines: per workspace, units and files to fold and folders skipped by kind', () => {
  assert.deepEqual(summaryLines(PLANS), [
    'workspace | units | files | folders | skipped folders',
    'apps/w | 1 | 3 | 1 | 1 (excluded 1)',
    'packages/p | 0 | 0 | 0 | 1 (cap 1)',
    'total | 1 | 3 | 1 | 2',
  ]);
});

test('folderLines: one line per folder with its units or why it is skipped', () => {
  assert.deepEqual(folderLines(PLANS), [
    'apps/w/src/a: A/ fold 3',
    'apps/w/src/routes/b: skipped (excluded: file-based route tree)',
    'packages/p/src/c: skipped (cap: packages/p/src/c would hold 13 sub-folders (max 12))',
  ]);
});

test('treeLines: every move of a folder, relative to it', () => {
  const [first] = PLANS;
  assert.deepEqual(treeLines(first ? [first] : []), [
    'apps/w/src/a/',
    '  A.tsx -> A/A.tsx',
    '  A.x.ts -> A/A.x.ts',
    '  A.y.ts -> A/A.y.ts',
  ]);
});
