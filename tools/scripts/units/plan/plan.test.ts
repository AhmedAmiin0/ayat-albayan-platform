import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planFolders } from './plan.ts';

const unit = (dir: string, name = 'A'): string[] =>
  [`${name}.tsx`, `${name}.x.test.tsx`, `${name}.y.test.tsx`].map((n) => `${dir}/${n}`);

const input = (paths: string[]): Parameters<typeof planFolders>[0] => ({
  paths,
  refs: new Map(),
  prDirs: new Map(),
});

test('a folder with a floating unit gets its moves', () => {
  const [plan] = planFolders(input(unit('apps/w/src/f')));
  assert.equal(plan?.skip, undefined);
  assert.deepEqual(
    plan?.units.flatMap((u) => u.moves.map((m) => m.to)),
    ['apps/w/src/f/A/A.tsx', 'apps/w/src/f/A/tests/x.test.tsx', 'apps/w/src/f/A/tests/y.test.tsx'],
  );
});

const SKIPS: [string, Parameters<typeof planFolders>[0], string][] = [
  ['route tree', input(unit('apps/w/src/routes/a')), 'file-based route tree'],
  [
    'open PR',
    { ...input(unit('apps/w/src/f')), prDirs: new Map([['apps/w/src/f', [4, 5]]]) },
    'open PR #4, #5 touches it',
  ],
  ['existing folder', input([...unit('apps/w/src/f'), 'apps/w/src/f/A/b.ts']), 'A/ already exists'],
  [
    'named by path',
    { ...input(unit('apps/w/src/f')), refs: new Map([['apps/w/src/f/A.tsx', ['knip.json']]]) },
    'apps/w/src/f/A.tsx is named by path in knip.json',
  ],
  [
    'cap',
    input([
      ...unit('apps/w/src/f'),
      ...Array.from({ length: 12 }, (_, i) => `apps/w/src/f/s${i}/a.ts`),
    ]),
    'apps/w/src/f would hold 13 sub-folders (max 12)',
  ],
];

test('a folder is skipped, with its reason, for each exclusion', () => {
  for (const [label, given, why] of SKIPS) {
    const plan = planFolders(given).find((p) => p.units.length > 0);
    assert.equal(plan?.skip?.why, why, label);
  }
});

test('only keeps the folders under the given paths', () => {
  const paths = [...unit('apps/w/src/a'), ...unit('apps/w/src/b')];
  const plans = planFolders({ ...input(paths), only: ['apps/w/src/b/'] });
  assert.deepEqual(
    plans.map((p) => p.dir),
    ['apps/w/src/b'],
  );
});
