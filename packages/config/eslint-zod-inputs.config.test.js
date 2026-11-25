// docs/36 Z-1: the zodInputs() block reaches a package's source files, not its tests.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { zodInputs } from './eslint-boundaries.js';
import { packageOverrides } from './oxlint/config.js';
import { rulesFor } from './oxlint/resolve.js';

const rulesOf = (blocks, file) =>
  rulesFor({ rules: {}, ...packageOverrides({ dir: 'pkg', react: false, blocks }) }, `pkg/${file}`);
const level = (file) => rulesOf([zodInputs({ files: ['src/**/*.ts'] })], file)['ab/zod-inputs'];

test('zodInputs(): an error on source files, off for tests, fakes and test apps', () => {
  assert.equal(level('src/a.controller.ts'), 'error');
  for (const file of ['src/a.test.ts', 'src/a.fakes.ts', 'src/test-app.ts']) {
    assert.equal(level(file), undefined, file);
  }
});

test('a package alone leaves ab/zod-inputs off (only Nest packages opt in)', () => {
  assert.equal(rulesOf([], 'src/a.controller.ts')['ab/zod-inputs'], undefined);
});
