import assert from 'node:assert/strict';
import { test } from 'node:test';
import { annotations } from '../run.mjs';
import { sourcePaths } from '../sources.mjs';

test('sourcePaths: the shared config, every package config and the root lint files, no tests', () => {
  const paths = [
    'packages/config/eslint-flow.js',
    'packages/config/eslint-flow.config.test.js',
    'packages/config/oxlint/rules.js',
    'packages/config/oxlint/core-rules.json',
    'packages/config/oxlint/testing/lint-code.js',
    'packages/config/type-imports/rule.js',
    'packages/config/type-imports/rule.test.js',
    'tsconfig.base.json',
    'apps/api/lint.blocks.mjs',
    'apps/api/src/a.js',
    '.oxlintrc.json',
    'knip.json',
    '.jscpd.json',
    'package.json',
  ];
  assert.deepEqual(sourcePaths(paths), [
    '.jscpd.json',
    '.oxlintrc.json',
    'apps/api/lint.blocks.mjs',
    'knip.json',
    'packages/config/eslint-flow.js',
    'packages/config/oxlint/core-rules.json',
    'packages/config/oxlint/rules.js',
    'packages/config/type-imports/rule.js',
  ]);
});

test('annotations: one «lint rules loosened» warning per finding', () => {
  assert.deepEqual(annotations(['rule off: max-len']), [
    '::warning title=lint rules loosened::rule off: max-len',
  ]);
});
