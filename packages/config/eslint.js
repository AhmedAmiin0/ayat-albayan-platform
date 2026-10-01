// Hard code rules (CLAUDE.md §1-3, R-NFR-05). CI fails on any violation.
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export const hardRules = {
  'max-lines': ['error', { max: 150, skipBlankLines: false, skipComments: false }],
  'max-params': 'off',
  '@typescript-eslint/max-params': ['error', { max: 3 }],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-non-null-assertion': 'error',
  complexity: ['warn', 10],
  // Nest @Module() classes are empty by design.
  '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
};

const ignores = ['**/dist/**', '**/coverage/**', '**/*.gen.ts', '**/.expo/**', '**/playwright-report/**'];

/** Base config for every package. Pass extra flat-config blocks to extend. */
export function config(...extra) {
  return defineConfig(
    { ignores },
    js.configs.recommended,
    tseslint.configs.strict,
    { languageOptions: { globals: { ...globals.node } }, rules: hardRules },
    ...extra,
  );
}

/** React (web/mobile) flavour. */
export function reactConfig(...extra) {
  return config(
    reactHooks.configs.flat['recommended-latest'],
    { languageOptions: { globals: { ...globals.browser } } },
    ...extra,
  );
}
