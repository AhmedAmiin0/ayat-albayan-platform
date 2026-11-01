import { boundaries, config, forbiddenImports, noParentImports, syntaxExempt } from '@ab/config/eslint';

export default config(
  import.meta.dirname,
  // Keeps consistent-type-imports from turning an injected class into `import type`: decorator metadata would
  // then name Object and Nest would fail at boot, not at typecheck (docs/31a §3.3).
  { languageOptions: { parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true } } },
  // docs/27 §1 rule 6: another module only through its index.ts (existing deep imports: eslint-suppressions.json).
  boundaries({ root: import.meta.dirname, files: ['src/**/*.ts'], module: 'src/modules/[^/]+/[^/]+', alias: { '@/': 'src/' } }),
  // Owner 2026-10-30, docs/32 R12: `@/…`, never `../` (existing ones: eslint-suppressions.json; the
  // sweep is `pnpm imports:absolute -- api --write`).
  noParentImports({ root: import.meta.dirname, files: ['src/**/*.ts'] }),
  // docs/36 H-1: the one outbound HTTP client of the api is the only place that calls fetch.
  syntaxExempt({ files: ['src/common/infra/http/**'], http: true }),
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
              regex: 'common/(settings/settings|configuration/config-store/store/config-store)\\.service(\\.js)?$',
              message: 'Read settings through this module\'s <module>.settings.ts reader.',
            },
          ],
        },
      ],
    },
  },
  // docs/32 R8 (D2): the database client (DB, Db) only in repositories (*.repo.ts), common/db and the adapters;
  // *.queries.ts until r16 renames them. Existing importers: eslint-suppressions.json.
  forbiddenImports({
    files: ['src/**/*.ts'],
    ignores: [
      '**/*.repo.ts',
      '**/*.queries.ts',
      'src/common/db/**',
      '**/*.supabase.ts',
      '**/account.auth.ts',
      'src/common/auth/auth-users.ts',
      'src/common/storage/storage.service.ts',
      '**/web-push.sender.ts',
      '**/expo-deliver.ts',
      '**/numbers.secrets.ts',
      '**/limit-store.db.ts',
    ],
    bans: [{ regex: '(^|/)db\\.module(\\.js)?$', names: ['DB', 'Db'], message: 'Data access: inject DB in a *.repo.ts repository.' }],
  }),
);
