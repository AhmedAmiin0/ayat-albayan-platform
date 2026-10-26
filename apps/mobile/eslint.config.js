import { boundaries, reactConfig } from '@ab/config/eslint';
export default reactConfig(
  { ignores: ['jest.config.cjs', 'jest.setup.cjs'] },
  // docs/27 §1 rule 6: another feature only through its index.ts; core/ and test/ are shared
  // (existing deep imports: eslint-suppressions.json).
  boundaries({ files: ['src/**/*.{ts,tsx}'], module: 'src/(?!core/|test/)[^/]+', alias: { '@/': 'src/' } }),
  {
    // RTL: a raw Text with no textAlign can sit at the physical left (docs/07 §14.1). Use AppText.
    files: ['app/**/*.tsx', 'src/**/*.tsx'],
    ignores: ['src/core/ui/primitives/AppText.tsx', '**/*.test.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [{ name: 'react-native', importNames: ['Text'], message: 'Use AppText from @/core/ui/primitives/AppText.' }] },
      ],
    },
  },
  {
    // docs/27 §1 rules 5–6: a route file imports a feature only through its index (`@/inbox`); `@/core/**` is shared.
    files: ['app/**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'react-native', importNames: ['Text'], message: 'Use AppText from @/core/ui/primitives/AppText.' }],
          patterns: [{ group: ['@/*/**', '!@/core/**'], message: 'Import the feature index (@/<feature>), not its internals.' }],
        },
      ],
    },
  },
);
