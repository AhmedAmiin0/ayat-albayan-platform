import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileDiff, optionsOf, oxlintRulesFor, summarize } from './config-parity.mjs';

const config = {
  rules: { eqeqeq: 'error' },
  overrides: [
    {
      files: ['apps/web/**/*'],
      rules: { complexity: ['error', { max: 8 }], 'no-console': 'error' },
    },
    { files: ['apps/web/**/*.ts'], rules: { complexity: ['error', { max: 6 }] } },
    {
      files: ['apps/web/**/*.test.*'],
      excludeFiles: ['**/keep.test.ts'],
      rules: { 'no-console': 'off' },
    },
  ],
};

test('oxlintRulesFor: overrides in order, excludeFiles skip one, off drops the rule', () => {
  assert.deepEqual(oxlintRulesFor(config, 'apps/web/a.tsx'), {
    eqeqeq: 'error',
    complexity: ['error', { max: 8 }],
    'no-console': 'error',
  });
  assert.deepEqual(Object.keys(oxlintRulesFor(config, 'apps/web/a.test.ts')), [
    'eqeqeq',
    'complexity',
  ]);
  assert.equal(oxlintRulesFor(config, 'apps/web/keep.test.ts')['no-console'], 'error');
});

test('optionsOf: ESLint [2, {}] and a bare level carry no options', () => {
  assert.deepEqual([optionsOf([2, {}]), optionsOf('error'), optionsOf([2, 6])], [[], [], [6]]);
});

test('fileDiff + summarize: a rule off in Oxlint, or with other options, per rule', () => {
  const eslint = {
    complexity: [2, { max: 8 }],
    'no-console': [2, {}],
    '@typescript-eslint/x': [2],
    off: [0],
  };
  const diff = fileDiff(eslint, oxlintRulesFor(config, 'apps/web/a.ts'));
  assert.deepEqual(diff, { lost: ['@typescript-eslint/x'], options: ['complexity'] });
  const lines = summarize([{ file: 'apps/web/a.ts', ...diff }], ['apps/web/b.ts']);
  assert.deepEqual(lines, [
    'off in Oxlint: @typescript-eslint/x (1 files, e.g. apps/web/a.ts)',
    'other options: complexity (1 files, e.g. apps/web/a.ts)',
    'not linted by Oxlint: apps/web/b.ts',
  ]);
});
