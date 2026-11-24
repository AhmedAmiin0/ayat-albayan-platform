// The rule options the base config sets on the type-aware presets, for app code and for tests.

// Overrides on top of strictTypeChecked + stylisticTypeChecked.
export const typedRules = {
  '@typescript-eslint/restrict-template-expressions': [
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
  // `name || 'fallback'` is meant for empty strings.
  '@typescript-eslint/prefer-nullish-coalescing': ['error', { ignorePrimitives: { string: true } }],
  '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
  // A new student status or state-machine member must be handled.
  '@typescript-eslint/switch-exhaustiveness-check': ['error', { requireDefaultForNonUnion: true }],
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
  ],
  '@typescript-eslint/no-import-type-side-effects': 'error',
  '@typescript-eslint/consistent-type-exports': 'error',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrors: 'all',
      ignoreRestSiblings: true,
    },
  ],
  // node:test's top-level test() / describe() calls are awaited by the runner.
  '@typescript-eslint/no-floating-promises': [
    'error',
    {
      allowForKnownSafeCalls: [
        { from: 'package', package: 'node:test', name: ['test', 'describe', 'it', 'suite'] },
      ],
    },
  ],
  // Its fix writes `x!`, which no-non-null-assertion bans.
  '@typescript-eslint/non-nullable-type-assertion-style': 'off',
};

// Fakes implement async interfaces without await, and Fastify inject `.json()` is untyped;
// floating and misused promises still fail in tests.
export const testRules = {
  'max-lines-per-function': 'off',
  '@typescript-eslint/require-await': 'off',
  '@typescript-eslint/unbound-method': 'off',
  '@typescript-eslint/no-unsafe-assignment': 'off',
  '@typescript-eslint/no-unsafe-member-access': 'off',
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/no-unsafe-argument': 'off',
  '@typescript-eslint/no-unsafe-return': 'off',
};
