// Hard code rules (CLAUDE.md §1-3, R-NFR-05) and the strict type-aware set (docs/31a). CI fails on any
// violation; the ones that predate a rule sit in each package's eslint-suppressions.json, whose per-rule
// totals may only shrink (refactor/guards/lint.json, pnpm guard:lint).
import { readFileSync } from 'node:fs';
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import oxlint from 'eslint-plugin-oxlint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { boundariesPlugin, TESTS } from './eslint-boundaries.js';

// Oxlint runs the rules of the root .oxlintrc.json first (`pnpm lint:ox`, a CI step before ESLint); ESLint turns
// them off and keeps the type-aware, custom and react-hooks rules. Oxlint has no bulk suppressions, so only a rule
// with no entry in any eslint-suppressions.json can move there (`pnpm guard:lint` checks it).
const oxlintrc = JSON.parse(readFileSync(new URL('../../.oxlintrc.json', import.meta.url), 'utf8'));

export { boundaries, forbiddenImports, TESTS } from './eslint-boundaries.js';
export { domainModuleRegex, routeImportGroup } from './eslint-domains.js';
export { reactRestrictions } from './eslint-react.js';

export const hardRules = {
  'max-lines': ['error', { max: 150, skipBlankLines: false, skipComments: false }],
  // docs/32 R1: 150 lines of at most 100 characters (the prettier width); long strings and URLs
  // may run on.
  'max-len': [
    'error',
    {
      code: 100,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreUrls: true,
      ignoreRegExpLiterals: true,
    },
  ],
  // docs/32 R2 + D1: 3 per function, 4 per constructor, method signatures included
  // (eslint-params.js).
  'max-params': 'off',
  '@typescript-eslint/max-params': 'off',
  'ab/max-params': 'error',
  // docs/32 R3: small single-purpose functions (tests: describe / it blocks run long).
  'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
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
  // node:test's top-level test() / describe() calls are awaited by the runner.
  '@typescript-eslint/no-floating-promises': [
    'error',
    { allowForKnownSafeCalls: [{ from: 'package', package: 'node:test', name: ['test', 'describe', 'it', 'suite'] }] },
  ],
  // Its fix writes `x!`, which no-non-null-assertion bans.
  '@typescript-eslint/non-nullable-type-assertion-style': 'off',
};

// Fakes implement async interfaces without await, and Fastify inject `.json()` is untyped; floating and
// misused promises still fail in tests.
const testRules = {
  'max-lines-per-function': 'off',
  '@typescript-eslint/require-await': 'off',
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
      linterOptions: { reportUnusedDisableDirectives: 'error' },
      plugins: { ab: boundariesPlugin },
      languageOptions: {
        globals: { ...globals.node },
        // *.mts: vitest configs that no tsconfig includes.
        parserOptions: { projectService: { allowDefaultProject: ['*.mts'] }, tsconfigRootDir: root },
      },
      rules: { ...hardRules, ...typedRules },
    },
    { files: TESTS, rules: testRules },
    ...extra,
    ...oxlint.buildFromOxlintConfig(oxlintrc),
    // Last, so no block above turns a type-aware rule back on for plain JS (eslint and jest configs, .mjs scripts).
    { files: ['**/*.{js,mjs,cjs}'], extends: [tseslint.configs.disableTypeChecked] },
  );
}

const hooks = reactHooks.configs.flat['recommended-latest'];

/** React (web/mobile) flavour: every react-hooks rule (the React Compiler's included) is an error. */
export function reactConfig(root, ...extra) {
  return config(
    root,
    hooks,
    {
      languageOptions: { globals: { ...globals.browser } },
      rules: {
        // Severity only: a preset rule keeps its options. A warning would fail CI unsuppressed (--max-warnings 0).
        ...Object.fromEntries(Object.keys(hooks.rules).map((rule) => [rule, 'error'])),
        'react-hooks/exhaustive-deps': 'error',
        'react-hooks/no-deriving-state-in-effects': 'error',
        // async onPress / onClick handlers are fine.
        '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      },
    },
    ...extra,
  );
}
