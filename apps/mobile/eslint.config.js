import { boundaries, reactConfig, reactRestrictions } from '@ab/config/eslint';
export default reactConfig(
  import.meta.dirname,
  { ignores: ['jest.config.cjs', 'jest.setup.cjs'] },
  // React 19.2 + experiments.reactCompiler (app.json): no forwardRef / useContext / .Provider / manual memo; effects in hooks.
  ...reactRestrictions({ files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'], effects: ['src/**/*.tsx', 'app/**/*.tsx'], react19: true }),
  // docs/27 §1 rule 6: another feature (and a route file in app/) only through its index.ts; core/ and test/ are shared
  // (existing deep imports: eslint-suppressions.json).
  boundaries({ root: import.meta.dirname, files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'], module: 'src/(?!core/|test/)[^/]+', alias: { '@/': 'src/' } }),
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
