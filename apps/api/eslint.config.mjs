import { config } from '@ab/config/eslint';

// Modules read settings through their own typed reader (<module>.settings.ts), never the
// store itself (docs/25-settings-and-config.md), nor ConfigStore (docs/26 §2e). Readers, tests and test harnesses may.
export default config({
  files: ['src/modules/**/*.ts'],
  ignores: ['**/*.settings.ts', '**/*.test.ts', '**/*.fakes.ts', '**/test-app*.ts', '**/*.test-app.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            regex: 'common/(settings/settings|config-store/config-store)\\.service(\\.js)?$',
            message: 'Read settings through this module\'s <module>.settings.ts reader.',
          },
        ],
      },
    ],
  },
});
