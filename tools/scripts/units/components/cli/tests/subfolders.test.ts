import assert from 'node:assert/strict';
import { test } from 'node:test';
import { subfoldersOf } from '../subfolders.ts';

test('only the folders right under dir that hold a file, once each', () => {
  const paths = [
    'a/Card/Card.tsx',
    'a/Card/Line/Line.tsx',
    'a/Card/Line/index.ts',
    'a/Card/x/y/z.ts',
    'a/Cards/b.ts',
  ];
  assert.deepEqual(subfoldersOf(paths, 'a/Card'), ['Line', 'x']);
});
