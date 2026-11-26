import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addedLines, isMapperPath } from './hunks.mjs';

test('reads the added lines of a zero-context diff', () => {
  const diff = [
    'diff --git a/x.mapper.ts b/x.mapper.ts',
    '@@ -3,0 +4,2 @@ export',
    '+a',
    '+b',
    '@@ -10 +12 @@',
    '-c',
    '+d',
    '@@ -20,2 +21,0 @@',
  ].join('\n');
  assert.deepEqual([...addedLines(diff)], [4, 5, 12]);
});

test('an api mapper outside tests is a mapper path', () => {
  assert.deepEqual(
    [
      'apps/api/src/modules/a/a.mapper.ts',
      'apps/api/src/modules/a/a.mapper.test.ts',
      'apps/api/src/modules/a/a.repo.ts',
      'apps/staff-web/src/a.mapper.ts',
    ].map(isMapperPath),
    [true, false, false, false],
  );
});
