import { reactConfig } from '@ab/config/eslint';
export default reactConfig(
  { ignores: ['jest.config.cjs', 'jest.setup.cjs'] },
  {
    // RTL: a raw Text with no textAlign can sit at the physical left (docs/07 §14.1). Use AppText.
    files: ['app/**/*.tsx', 'src/**/*.tsx'],
    ignores: ['src/ui/AppText.tsx', '**/*.test.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [{ name: 'react-native', importNames: ['Text'], message: 'Use AppText from @/ui/AppText.' }] },
      ],
    },
  },
);
