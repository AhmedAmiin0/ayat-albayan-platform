import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openPrDirs } from './open-prs.ts';

test('openPrDirs maps each folder an open PR touches to its PR numbers', () => {
  const json = JSON.stringify([
    { number: 7, files: [{ path: 'apps/web/src/a/x.ts' }, { path: 'apps/web/src/b/y.ts' }] },
    { number: 9, files: [{ path: 'apps/web/src/a/z.ts' }] },
  ]);
  assert.deepEqual(Object.fromEntries(openPrDirs(json)), {
    'apps/web/src/a': [7, 9],
    'apps/web/src/b': [7],
  });
});

test('openPrDirs refuses output that is not the gh JSON it asked for', () => {
  assert.throws(() => openPrDirs('[{"number":"7"}]'));
});
