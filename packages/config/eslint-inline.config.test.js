// docs/59: no inline escapes. Every package config ignores `eslint-disable` and `/* eslint */`
// comments, so none can hide a finding.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import { config, reactConfig } from './eslint.js';

const root = import.meta.dirname;
const optionsFor = async (blocks, file) => {
  const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: blocks });
  return (await eslint.calculateConfigForFile(file)).linterOptions;
};

test('config() and reactConfig(): inline config comments are off for every file', async () => {
  for (const [blocks, file] of [
    [config(root), 'src/a.ts'],
    [config(root), 'src/a.mjs'],
    [reactConfig(root), 'src/a.tsx'],
  ]) {
    assert.equal((await optionsFor(blocks, file)).noInlineConfig, true, file);
  }
});
