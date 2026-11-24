// Hard code rules (CLAUDE.md §1-3, R-NFR-05) and the strict type-aware set (docs/31a). CI fails on
// any violation; the ones that predate a rule sit in each package's eslint-suppressions.json, whose
// per-rule totals may not rise above the base branch's on a PR (pnpm guard:lint).
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import oxlint from 'eslint-plugin-oxlint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { boundariesPlugin, TESTS } from './eslint-boundaries.js';
import { dateRestrictions } from './eslint-dates.js';
import { flowBlocks, flowRules } from './eslint-flow.js';
import { syntaxBlocks } from './eslint-syntax.js';
import { testRules, typedRules } from './eslint-typed.js';
// Oxlint runs the rules of the root .oxlintrc.json first (`pnpm lint:ox`, a CI step before ESLint);
// ESLint turns them off and keeps the type-aware, custom and react-hooks rules. Oxlint has no bulk
// suppressions, so only a rule with no entry in any eslint-suppressions.json can move there
// (`pnpm guard:lint` checks it).
import oxlintrc from '../../.oxlintrc.json' with { type: 'json' };

export {
  boundaries,
  forbiddenImports,
  noParentImports,
  TESTS,
  zodInputs,
} from './eslint-boundaries.js';
export { domainModuleRegex, routeImportGroup } from './eslint-domains.js';
export { reactRestrictions } from './eslint-react.js';
export { SYNTAX, syntaxExempt } from './eslint-syntax.js';

export const hardRules = {
  'max-lines': ['error', { max: 150, skipBlankLines: false, skipComments: false }],
  // docs/32 R1: 150 lines of at most 100 characters (the oxfmt width); long strings and URLs
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
  'no-console': 'error',
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  // Nest @Module() classes are empty by design.
  '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
};

// test-results: Playwright rewrites it while lint runs in parallel under turbo (ENOENT race).
const ignores = [
  '**/dist/**',
  '**/coverage/**',
  '**/*.gen.ts',
  '**/.expo/**',
  '**/playwright-report/**',
  '**/test-results/**',
];

/**
 * Base config for every package. `root` is the package directory (`import.meta.dirname`), where
 * the type-aware rules find its tsconfig. Pass extra flat-config blocks to extend.
 */
export function config(root, ...extra) {
  return defineConfig(
    { ignores },
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
      linterOptions: { noInlineConfig: true },
      plugins: { ab: boundariesPlugin },
      languageOptions: {
        globals: { ...globals.node },
        // *.mts: vitest configs that no tsconfig includes.
        parserOptions: {
          projectService: { allowDefaultProject: ['*.mts'] },
          tsconfigRootDir: root,
        },
      },
      rules: { ...hardRules, ...flowRules, ...typedRules },
    },
    ...flowBlocks,
    { rules: { 'no-restricted-properties': ['error', ...dateRestrictions] } },
    ...syntaxBlocks(TESTS),
    { files: TESTS, rules: testRules },
    { files: [...TESTS, 'src/time/**'], rules: { 'no-restricted-properties': 'off' } },
    ...extra,
    ...oxlint.buildFromOxlintConfig(oxlintrc),
    // Last, so no block above turns a type-aware rule back on for plain JS (eslint and jest
    // configs, .mjs scripts).
    { files: ['**/*.{js,mjs,cjs}'], extends: [tseslint.configs.disableTypeChecked] },
  );
}

const hooks = reactHooks.configs.flat['recommended-latest'];

/** React (web/mobile) flavour: every react-hooks rule (React Compiler ones too) is an error. */
export function reactConfig(root, ...extra) {
  return config(
    root,
    hooks,
    {
      languageOptions: { globals: { ...globals.browser } },
      rules: {
        // Severity only: a preset rule keeps its options. A warning would fail CI unsuppressed
        // (--max-warnings 0).
        ...Object.fromEntries(Object.keys(hooks.rules).map((rule) => [rule, 'error'])),
        'react-hooks/exhaustive-deps': 'error',
        'react-hooks/no-deriving-state-in-effects': 'error',
        // async onPress / onClick handlers are fine.
        '@typescript-eslint/no-misused-promises': [
          'error',
          { checksVoidReturn: { attributes: false } },
        ],
      },
    },
    ...extra,
  );
}
