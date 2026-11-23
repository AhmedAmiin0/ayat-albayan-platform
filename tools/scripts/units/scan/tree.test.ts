import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exclusionOf, foldersOf, workspaceOf } from './tree.ts';

test('foldersOf groups tracked paths of apps, packages and tools by folder', () => {
  const paths = [
    'apps/web/src/a.ts',
    'apps/web/src/b.ts',
    'packages/x/src/c/d.ts',
    'docs/a.ts',
    'e.ts',
  ];
  assert.deepEqual(Object.fromEntries(foldersOf(paths)), {
    'apps/web/src': ['a.ts', 'b.ts'],
    'packages/x/src/c': ['d.ts'],
  });
});

const EXCLUDED: [string, string | undefined][] = [
  ['apps/api/src/modules/finance/x', 'Nest modules (their own lane)'],
  ['apps/api/src/common/auth', undefined],
  ['apps/staff-mobile/app/(tabs)', 'expo-router app/ tree'],
  ['apps/family-mobile/app', 'expo-router app/ tree'],
  ['apps/staff-mobile/src/app', undefined],
  ['apps/staff-web/src/routes/admin', 'file-based route tree'],
  ['packages/db/supabase/functions', 'packages/db types and supabase'],
  ['packages/db/src', 'packages/db types and supabase'],
  ['e2e/tests', undefined],
  ['packages/money/src/ledger', undefined],
];

test('exclusionOf names why a folder is never folded', () => {
  for (const [dir, why] of EXCLUDED) assert.equal(exclusionOf(dir)?.why, why, dir);
});

test('workspaceOf is the first two path segments', () => {
  assert.equal(workspaceOf('apps/staff-web/src/a/b'), 'apps/staff-web');
  assert.equal(workspaceOf('tools/scripts'), 'tools/scripts');
});
