import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mover } from '../renames.mjs';

test('mover: a renamed file, a folder that moved whole, else the path itself', () => {
  const renames = [
    ['apps/api/src/a/x.ts', 'apps/api/src/b/x.ts'],
    ['apps/api/src/a/y.ts', 'apps/api/src/b/y.ts'],
    ['e2e/one.ts', 'e2e/two.ts'],
  ];
  const move = mover(renames, (dir) => dir === 'apps/api/src/a');
  assert.equal(move('e2e/one.ts'), 'e2e/two.ts');
  assert.equal(move('apps/api/src/a'), 'apps/api/src/b');
  assert.equal(move('apps/api/src/a/z.ts'), 'apps/api/src/b/z.ts');
  assert.equal(move('apps/api/src/ab/z.ts'), 'apps/api/src/ab/z.ts');
  assert.equal(move('e2e/three.ts'), 'e2e/three.ts');
});
