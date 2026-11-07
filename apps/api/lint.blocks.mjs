// The api's own lint blocks (flat-config shape), read by eslint.config.mjs and by Oxlint
// (oxlint.full.config.ts): docs/31b-oxlint-mapping.md.
import {
  boundaries,
  forbiddenImports,
  noParentImports,
  syntaxExempt,
  zodInputs,
} from '@ab/config/lint';

const root = import.meta.dirname;

// Data access: the database client (DB, Db) only in repositories (*.repo.ts), common/db and the
// adapters; *.queries.ts until r16 renames them (docs/32 R8, D2).
const DB_CLIENT = [
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
];
const SETTINGS = 'common/(settings/settings|configuration/config-store/store/config-store)';

export default {
  react: false,
  blocks: [
    // docs/27 §1 rule 6: another module only through its index.ts (existing deep imports: the
    // suppressions baseline).
    boundaries({
      root,
      files: ['src/**/*.ts'],
      module: 'src/modules/[^/]+/[^/]+',
      alias: { '@/': 'src/' },
    }),
    // Owner 2026-10-30, docs/32 R12: `@/…`, never `../` (the sweep is
    // `pnpm imports:absolute -- api --write`).
    noParentImports({ root, files: ['src/**/*.ts'] }),
    // docs/36 H-1: the one outbound HTTP client of the api is the only place that calls fetch.
    syntaxExempt({ files: ['src/common/infra/http/**'], http: true }),
    // docs/36 Z-1: Nest inputs through ZodBody/ZodQuery/ZodParam/ZodHeaders.
    zodInputs({ files: ['src/**/*.ts'] }),
    // Modules read settings through their own typed reader (<module>.settings.ts), never the
    // store itself (docs/25-settings-and-config.md), nor ConfigStore (docs/26 §2e). Readers,
    // tests and test harnesses may.
    {
      files: ['src/modules/**/*.ts'],
      ignores: [
        '**/*.settings.ts',
        '**/*.test.ts',
        '**/*.fakes.ts',
        '**/test-app*.ts',
        '**/*.test-app.ts',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                regex: `${SETTINGS}\\.service(\\.js)?$`,
                message: "Read settings through this module's <module>.settings.ts reader.",
              },
            ],
          },
        ],
      },
    },
    forbiddenImports({
      files: ['src/**/*.ts'],
      ignores: DB_CLIENT,
      bans: [
        {
          regex: '(^|/)db\\.module(\\.js)?$',
          names: ['DB', 'Db'],
          message: 'Data access: inject DB in a *.repo.ts repository.',
        },
      ],
    }),
  ],
};
