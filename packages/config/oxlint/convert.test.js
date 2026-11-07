import assert from 'node:assert/strict';
import { test } from 'node:test';
import { oxlintName, toOverrides } from './convert.js';

test('oxlintName: typescript-eslint, react-hooks and the JS-plugin rules get their Oxlint key', () => {
  const names = [
    '@typescript-eslint/no-floating-promises',
    '@typescript-eslint/no-empty-function',
    'react-hooks/purity',
    'react-hooks/gating',
    'no-restricted-syntax',
    'max-len',
    'ab/module-boundaries',
    'complexity',
  ];
  assert.deepEqual(names.map(oxlintName), [
    'typescript/no-floating-promises',
    'no-empty-function',
    'react/purity',
    'react-hooks-js/gating',
    'ab/no-restricted-syntax',
    'stylistic/max-len',
    'ab/module-boundaries',
    'complexity',
  ]);
});

test('toOverrides: files and ignores scoped to the package, ignores-only blocks are global', () => {
  const blocks = [
    { ignores: ['cache/**'] },
    { rules: { 'no-console': 'off' } },
    {
      files: ['src/**/*.ts'],
      ignores: ['**/*.test.ts'],
      rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' },
    },
  ];
  assert.deepEqual(toOverrides('tools/migrate', blocks), {
    ignorePatterns: ['tools/migrate/cache/**'],
    overrides: [
      { files: ['tools/migrate/**/*'], rules: { 'no-console': 'off' } },
      {
        files: ['tools/migrate/src/**/*.ts'],
        excludeFiles: ['tools/migrate/**/*.test.ts'],
        rules: { 'typescript/explicit-module-boundary-types': 'error' },
      },
    ],
  });
});

test('toOverrides: a block key Oxlint would drop fails; ESLint\'s `ab` registration is fine', () => {
  const ab = { files: ['src/**'], plugins: { ab: {} }, rules: {} };
  assert.equal(toOverrides('e2e', [ab]).overrides.length, 1);
  const globals = { files: ['src/**'], languageOptions: { globals: {} }, rules: {} };
  assert.throws(() => toOverrides('e2e', [globals]), /languageOptions/);
  assert.throws(() => toOverrides('e2e', [{ plugins: { x: {} }, rules: {} }]), /plugins/);
});
