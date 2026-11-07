// Type-aware rules (tsgolint, `oxlint --type-aware`): typescript-eslint's strictTypeChecked and
// stylisticTypeChecked presets plus eslint.js typedRules, with the options ESLint resolves today
// (docs/31b-oxlint-mapping.md). TypeScript files only: ESLint's disableTypeChecked leaves JS files.

/** Preset rules that take no option (ESLint resolves their defaults the same way). */
const PLAIN = [
  'await-thenable',
  'consistent-type-exports',
  'no-array-delete',
  'no-base-to-string',
  'no-deprecated',
  'no-duplicate-type-constituents',
  'no-for-in-array',
  'no-generated-empty-object-type',
  'no-implied-eval',
  'no-meaningless-void-operator',
  'no-misused-spread',
  'no-mixed-enums',
  'no-redundant-type-constituents',
  'no-unnecessary-boolean-literal-compare',
  'no-unnecessary-condition',
  'no-unnecessary-template-expression',
  'no-unnecessary-type-arguments',
  'no-unnecessary-type-assertion',
  'no-unnecessary-type-conversion',
  'no-unnecessary-type-parameters',
  'no-unsafe-argument',
  'no-unsafe-assignment',
  'no-unsafe-call',
  'no-unsafe-enum-assignment',
  'no-unsafe-enum-comparison',
  'no-unsafe-member-access',
  'no-unsafe-return',
  'no-unsafe-unary-minus',
  'no-useless-default-assignment',
  'only-throw-error',
  'prefer-find',
  'prefer-includes',
  'prefer-optional-chain',
  'prefer-promise-reject-errors',
  'prefer-reduce-type-parameter',
  'prefer-regexp-exec',
  'prefer-return-this-type',
  'prefer-string-starts-ends-with',
  'related-getter-setter-pairs',
  'require-await',
  'unbound-method',
  'use-unknown-in-catch-callback-variable',
];

const OPTIONS = {
  'typescript/dot-notation': [
    'error',
    {
      allowIndexSignaturePropertyAccess: false,
      allowKeywords: true,
      allowPattern: '',
      allowPrivateClassPropertyAccess: false,
      allowProtectedClassPropertyAccess: false,
    },
  ],
  'typescript/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
  // node:test's top-level test() / describe() calls are awaited by the runner.
  'typescript/no-floating-promises': [
    'error',
    {
      allowForKnownSafeCalls: [
        { from: 'package', package: 'node:test', name: ['test', 'describe', 'it', 'suite'] },
      ],
    },
  ],
  'typescript/no-misused-promises': 'error',
  // `name || 'fallback'` is meant for empty strings.
  'typescript/prefer-nullish-coalescing': ['error', { ignorePrimitives: { string: true } }],
  'typescript/restrict-plus-operands': [
    'error',
    {
      allowAny: false,
      allowBoolean: false,
      allowNullish: false,
      allowNumberAndString: false,
      allowRegExp: false,
    },
  ],
  'typescript/restrict-template-expressions': [
    'error',
    {
      allowAny: false,
      allowBoolean: false,
      allowNever: false,
      allowNullish: false,
      allowRegExp: false,
      allowNumber: true,
    },
  ],
  'typescript/return-await': ['error', 'error-handling-correctness-only'],
  // A new student status or state-machine member must be handled.
  'typescript/switch-exhaustiveness-check': ['error', { requireDefaultForNonUnion: true }],
};

export const TYPED = {
  ...Object.fromEntries(PLAIN.map((rule) => [`typescript/${rule}`, 'error'])),
  ...OPTIONS,
};

/** Tests: fakes implement async interfaces without await; Fastify inject `.json()` is untyped. */
export const TYPED_TEST_OFF = [
  'typescript/require-await',
  'typescript/unbound-method',
  'typescript/no-unsafe-assignment',
  'typescript/no-unsafe-member-access',
  'typescript/no-unsafe-call',
  'typescript/no-unsafe-argument',
  'typescript/no-unsafe-return',
];
