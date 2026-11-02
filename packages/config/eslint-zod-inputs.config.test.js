// docs/36 Z-1: the zodInputs() block reaches a package config's source files, not its tests.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import { config, zodInputs } from './eslint.js';

const root = import.meta.dirname;
const level = async (file) => {
  const blocks = config(root, zodInputs({ files: ['src/**/*.ts'] }));
  const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: blocks });
  return (await eslint.calculateConfigForFile(file)).rules['ab/zod-inputs']?.[0];
};

test('zodInputs(): an error on source files, off for tests, fakes and test apps', async () => {
  assert.equal(await level('src/a.controller.ts'), 2);
  for (const file of ['src/a.test.ts', 'src/a.fakes.ts', 'src/test-app.ts']) {
    assert.equal(await level(file), undefined, file);
  }
});

test('config() alone leaves ab/zod-inputs off (only Nest packages opt in)', async () => {
  const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: config(root) });
  const rules = (await eslint.calculateConfigForFile('src/a.controller.ts')).rules;
  assert.equal(rules['ab/zod-inputs'], undefined);
});
