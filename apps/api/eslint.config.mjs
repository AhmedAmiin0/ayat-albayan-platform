import { boundaries, config } from '@ab/config/eslint';

export default config(
  import.meta.dirname,
  // Keeps consistent-type-imports from turning an injected class into `import type`: decorator metadata would
  // then name Object and Nest would fail at boot, not at typecheck (docs/31a §3.3).
  { languageOptions: { parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true } } },
  // docs/27 §1 rule 6: another module only through its index.ts (existing deep imports: eslint-suppressions.json).
  boundaries({ root: import.meta.dirname, files: ['src/**/*.ts'], module: 'src/modules/[^/]+/[^/]+' }),
  // Modules read settings through their own typed reader (<module>.settings.ts), never the
  // store itself (docs/25-settings-and-config.md), nor ConfigStore (docs/26 §2e). Readers, tests and test harnesses may.
  {
    files: ['src/modules/**/*.ts'],
    ignores: ['**/*.settings.ts', '**/*.test.ts', '**/*.fakes.ts', '**/test-app*.ts', '**/*.test-app.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: 'common/(settings/settings|config-store/store/config-store)\\.service(\\.js)?$',
              message: 'Read settings through this module\'s <module>.settings.ts reader.',
            },
          ],
        },
      ],
    },
  },
);
