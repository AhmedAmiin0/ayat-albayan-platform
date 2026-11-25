import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportTypes, libraryBlocks, TESTS } from './lint.js';

test('exportTypes: exported functions in src declare their types, tests exempt', () => {
  assert.deepEqual(exportTypes, {
    files: ['src/**/*.ts'],
    ignores: TESTS,
    rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' },
  });
});

test('libraryBlocks: module boundaries, then exportTypes', () => {
  const blocks = libraryBlocks({ root: 'src', module: 'src/*' });
  assert.equal(blocks.length, 2);
  assert.equal(blocks[1], exportTypes);
});
