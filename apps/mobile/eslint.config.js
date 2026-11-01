import { boundaries, domainModuleRegex, forbiddenImports, noParentImports, reactConfig, reactRestrictions, routeImportGroup, syntaxExempt } from '@ab/config/eslint';

// docs/32 g1: the domains already regrouped into `src/<domain>/<module>` (two-level modules). Each c-row move
// adds its domain here in the same PR that moves ALL of src/<domain>/ into src/<domain>/<module>/ (a listed domain
// makes each sub-folder its own module); empty = every feature is a one-level module, as before.
const DOMAINS = [];
export default reactConfig(
  import.meta.dirname,
  { ignores: ['babel.config.cjs', 'jest.config.cjs', 'jest.setup.cjs'] },
  // React 19.2: no forwardRef / useContext / .Provider; effects in hooks. The React Compiler builds every file
  // (babel.config.cjs, jest included), so no useMemo / useCallback / memo by hand.
  ...reactRestrictions({ files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'], effects: ['src/**/*.tsx', 'app/**/*.tsx'], compiler: true, react19: true }),
  // docs/27 §1 rule 6: another feature (and a route file in app/) only through its index.ts; core/ and test/ are shared
  // (existing deep imports: eslint-suppressions.json).
  boundaries({ root: import.meta.dirname, files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'], module: domainModuleRegex({ base: 'src', exempt: ['core', 'test'], domains: DOMAINS }), alias: { '@/': 'src/' } }),
  // Owner 2026-10-30, docs/32 R12: `@/…`, never `../` (existing ones: eslint-suppressions.json; the
  // sweep is `pnpm imports:absolute -- mobile --write`).
  noParentImports({ root: import.meta.dirname, files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'] }),
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
          patterns: [{ group: routeImportGroup({ prefix: '@/', exempt: ['core'], domains: DOMAINS }), message: 'Import the feature index (@/<feature>), not its internals.' }],
        },
      ],
    },
  },
  // docs/36 «Stays exempt»: the reach wrapper, the connectivity probe and the local file:// reads call
  // fetch (H-1); the query cache patcher reads its own cached pages (Z-2).
  syntaxExempt({
    files: [
      'src/core/lib/http/api.ts',
      'src/core/lib/connectivity/probe.ts',
      'src/inbox/composer/send-file.ts',
      'src/inbox/composer/voice/send-voice.ts',
    ],
    http: true,
  }),
  syntaxExempt({ files: ['src/core/lib/query/paging.ts'], shapes: true }),
  // docs/32 R8: a component calls the API through a query or mutation hook, not apiFetch / apiSend
  // (existing ones: eslint-suppressions.json).
  forbiddenImports({
    files: ['src/**/*.tsx', 'app/**/*.tsx'],
    bans: [{ regex: '(^|/)http/api(\\.js)?$', names: ['apiFetch', 'apiSend'], message: 'Call the API from a hook, not a component.' }],
  }),
);
