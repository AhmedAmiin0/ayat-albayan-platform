// Hard code rules (CLAUDE.md §1-3, R-NFR-05). CI fails on any violation.
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { TESTS } from './eslint-boundaries.js';

export { boundaries, TESTS } from './eslint-boundaries.js';

export const hardRules = {
  'max-lines': ['error', { max: 150, skipBlankLines: false, skipComments: false }],
  'max-params': 'off',
  '@typescript-eslint/max-params': ['error', { max: 3 }],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-non-null-assertion': 'error',
  complexity: ['error', 10],
  'max-depth': ['error', 3],
  'no-console': 'error',
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  // Nest @Module() classes are empty by design.
  '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
};

// Overrides on top of strictTypeChecked + stylisticTypeChecked.
const typedRules = {
  '@typescript-eslint/restrict-template-expressions': [
    'error',
    { allowAny: false, allowBoolean: false, allowNever: false, allowNullish: false, allowRegExp: false, allowNumber: true },
  ],
  // `name || 'fallback'` is meant for empty strings.
  '@typescript-eslint/prefer-nullish-coalescing': ['error', { ignorePrimitives: { string: true } }],
  '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
  // A new student status or state-machine member must be handled.
  '@typescript-eslint/switch-exhaustiveness-check': ['error', { requireDefaultForNonUnion: true }],
  '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'separate-type-imports' }],
  '@typescript-eslint/no-import-type-side-effects': 'error',
  '@typescript-eslint/consistent-type-exports': 'error',
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'all', ignoreRestSiblings: true },
  ],
};

// Fakes and Fastify inject `.json()` are untyped by nature; floating promises still fail.
const testRules = {
  '@typescript-eslint/unbound-method': 'off',
  '@typescript-eslint/no-unsafe-assignment': 'off',
  '@typescript-eslint/no-unsafe-member-access': 'off',
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/no-unsafe-argument': 'off',
  '@typescript-eslint/no-unsafe-return': 'off',
};

// test-results: Playwright rewrites it while lint runs in parallel under turbo (ENOENT race).
const ignores = ['**/dist/**', '**/coverage/**', '**/*.gen.ts', '**/.expo/**', '**/playwright-report/**', '**/test-results/**'];

/**
 * Base config for every package. `root` is the package directory (`import.meta.dirname`), where the
 * type-aware rules find its tsconfig. Pass extra flat-config blocks to extend.
 */
export function config(root, ...extra) {
  return defineConfig(
    { ignores },
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
      languageOptions: {
        globals: { ...globals.node },
        // *.mts: vitest configs that no tsconfig includes.
        parserOptions: { projectService: { allowDefaultProject: ['*.mts'] }, tsconfigRootDir: root },
      },
      rules: { ...hardRules, ...typedRules },
    },
    { files: TESTS, rules: testRules },
    ...extra,
    // Last, so no block above turns a type-aware rule back on for plain JS.
    { files: ['**/*.{js,mjs,cjs}'], extends: [tseslint.configs.disableTypeChecked] },
  );
}

/** Effects live in a named hook (`use-*.ts(x)` or `hooks/`), not inline in a component. */
export function noRawEffect(files) {
  const message = 'Move the effect into a named hook (use-*.ts or hooks/).';
  return {
    files,
    ignores: ['**/use-*.ts', '**/use-*.tsx', '**/hooks/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'CallExpression[callee.name=/^use(Layout)?Effect$/]', message },
        { selector: 'CallExpression[callee.property.name=/^use(Layout)?Effect$/]', message },
      ],
    },
  };
}

/** React (web/mobile) flavour. */
export function reactConfig(root, ...extra) {
  return config(
    root,
    reactHooks.configs.flat['recommended-latest'],
    {
      languageOptions: { globals: { ...globals.browser } },
      rules: {
        'react-hooks/exhaustive-deps': 'error',
        'react-hooks/no-deriving-state-in-effects': 'error',
        // async onPress / onClick handlers are fine.
        '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      },
    },
    ...extra,
  );
}
