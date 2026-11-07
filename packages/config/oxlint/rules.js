// The non-type-aware ESLint rules of eslint.js under Oxlint names (docs/31b-oxlint-mapping.md):
// the hard rules (CLAUDE.md 1-3), the flow rules (rule 11), the presets' syntax rules and the date
// and fetch restrictions. Each keeps the options ESLint resolves today.
import { dateRestrictions } from '../eslint-dates.js';
import { flowRules } from '../eslint-flow.js';
import { SYNTAX } from '../eslint-syntax.js';

const H1 = SYNTAX['ab/no-global-fetch'][0].message;

/** Every linted file (ESLint: the base rules block plus the presets). */
export const ALL = {
  // CLAUDE.md 1: 150 lines of at most 100 characters; long strings and URLs may run on.
  'max-lines': ['error', { max: 150, skipBlankLines: false, skipComments: false }],
  'stylistic/max-len': [
    'error',
    {
      code: 100,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreUrls: true,
      ignoreRegExpLiterals: true,
    },
  ],
  'ab/max-params': 'error',
  'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
  'no-console': 'error',
  ...flowRules,
  'no-else-return': ['error', { allowElseIf: true }],
  'no-restricted-properties': ['error', ...dateRestrictions],
  'no-restricted-globals': ['error', { name: 'fetch', message: H1 }],
  ...Object.fromEntries(Object.entries(SYNTAX).map(([rule, list]) => [rule, ['error', ...list]])),
  'typescript/consistent-indexed-object-style': 'error',
  'typescript/consistent-type-definitions': 'error',
  'typescript/consistent-type-imports': [
    'error',
    { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
  ],
  'typescript/no-dynamic-delete': 'error',
  'typescript/no-import-type-side-effects': 'error',
  'no-empty-function': ['error', { allow: [] }],
  'no-unused-expressions': [
    'error',
    { allowShortCircuit: false, allowTaggedTemplates: false, allowTernary: false },
  ],
  'ab/no-octal': 'error',
  'no-regex-spaces': 'error',
  'no-unsafe-optional-chaining': ['error', { disallowArithmeticOperators: false }],
  'no-useless-assignment': 'error',
};

/** The stricter complexity of plain `.ts` files (eslint-flow.js flowBlocks). */
export const PLAIN_TS = { complexity: ['error', { max: 6, variant: 'classic' }] };

/**
 * JS files only: js.configs.recommended rules that typescript-eslint's eslint-recommended turns
 * off for TypeScript (the compiler checks them), and no-require-imports (.oxlintrc.json: TS only).
 */
export const JS_ONLY = {
  'typescript/no-require-imports': 'error',
  'constructor-super': 'error',
  'getter-return': ['error', { allowImplicit: false }],
  'no-class-assign': 'error',
  'no-const-assign': 'error',
  'ab/no-dupe-args': 'error',
  'no-dupe-class-members': 'error',
  'no-dupe-keys': 'error',
  'no-func-assign': 'error',
  'no-import-assign': 'error',
  'no-new-native-nonconstructor': 'error',
  'no-obj-calls': 'error',
  'no-redeclare': ['error', { builtinGlobals: true }],
  'no-setter-return': 'error',
  'no-this-before-super': 'error',
  'no-undef': ['error', { typeof: false }],
  'no-unreachable': 'error',
  'no-unsafe-negation': ['error', { enforceForOrderingRelations: false }],
  'no-with': 'error',
};

/** Tests and fakes (eslint.js testRules + syntaxBlocks): long blocks, fetch and raw shapes. */
export const TEST_OFF = [
  'max-lines-per-function',
  'no-restricted-globals',
  'ab/no-global-fetch',
  'ab/no-shape-checks',
];
