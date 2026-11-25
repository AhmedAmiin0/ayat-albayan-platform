// The mobile app's own lint blocks (flat-config shape), read by oxlint.config.ts:
// docs/31b-oxlint-mapping.md.
import {
  boundaries,
  domainModuleRegex,
  forbiddenImports,
  LOCAL_HOOKS,
  noParentImports,
  reactRestrictions,
  routeImportGroup,
  syntaxExempt,
} from '@ab/config/lint';

const root = import.meta.dirname;
// docs/32 g1: the domains already regrouped into `src/<domain>/<module>` (two-level modules). Each
// c-row move adds its domain here in the same PR that moves ALL of src/<domain>/ into
// src/<domain>/<module>/ (a listed domain makes each sub-folder its own module).
const DOMAINS = ['sales'];
const APP = ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'];
const TSX = ['src/**/*.tsx', 'app/**/*.tsx'];
const TEXT = {
  name: 'react-native',
  importNames: ['Text'],
  message: 'Use AppText from @ab/mobile-kit.',
};
const ROUTES = {
  group: routeImportGroup({ prefix: '@/', exempt: ['core'], domains: DOMAINS }),
  message: 'Import the feature index (@/<feature>), not its internals.',
};
// docs/36 «Stays exempt»: the local file:// reads call fetch (H-1; the HTTP client's own reads
// are in @ab/mobile-kit). docs/38: the shared files' cached copies (file://) are read as pickPdf
// reads its copy, and the lesson file pickers (pick-file.ts) read the picked asset's.
const FETCH = [
  'src/inbox/composer/send-file.ts',
  'src/inbox/thread/share/shared-file.ts',
  'src/inbox/composer/voice/send-voice.ts',
  'src/teaching/lesson-files/pick-file.ts',
];
// apiFetch / apiSend come from the shared kit (@ab/mobile-kit) or its http/api module.
const API = '(^|/)http/api(\\.js)?$|^@ab/mobile-kit$';

export default {
  react: true,
  blocks: [
    { ignores: ['babel.config.cjs', 'jest.config.cjs', 'jest.setup.cjs', '**/__snapshots__/**'] },
    // React 19.2: no forwardRef / useContext / .Provider; effects in hooks. The React Compiler
    // builds every file (babel.config.cjs, jest included), so no useMemo / useCallback / memo.
    ...reactRestrictions({ files: APP, effects: TSX, compiler: true, react19: true }),
    // docs/27 §1 rule 6: another feature (and a route file in app/) only through its index.ts;
    // core/ and test/ are shared.
    boundaries({
      root,
      files: APP,
      module: domainModuleRegex({ base: 'src', exempt: ['core', 'test'], domains: DOMAINS }),
      alias: { '@/': 'src/' },
    }),
    // Owner 2026-10-30, docs/32 R12: `@/…`, never `../` (the sweep is
    // `pnpm imports:absolute -- staff-mobile --write`).
    noParentImports({ root, files: APP }),
    // RTL: a raw Text with no textAlign can sit at the physical left (docs/07 §14.1).
    {
      files: TSX,
      ignores: ['**/*.test.tsx'],
      rules: { 'no-restricted-imports': ['error', { paths: [TEXT] }] },
    },
    // docs/27 §1 rules 5–6: a route file imports a feature only through its index (`@/inbox`);
    // `@/core/**` is shared.
    {
      files: ['app/**/*.tsx'],
      ignores: ['**/*.test.tsx'],
      rules: { 'no-restricted-imports': ['error', { paths: [TEXT], patterns: [ROUTES] }] },
    },
    syntaxExempt({ files: FETCH, http: true }),
    // The query cache patcher reads its own cached pages (Z-2).
    syntaxExempt({ files: ['src/core/lib/query/paging.ts'], shapes: true }),
    // docs/32 R8: a component calls the API through a query or mutation hook, not apiFetch /
    // apiSend; its own local hook neither (docs/63 §3).
    forbiddenImports({
      files: [...TSX, ...LOCAL_HOOKS],
      bans: [
        {
          regex: API,
          names: ['apiFetch', 'apiSend'],
          message: 'Call the API from a hook, not a component.',
        },
      ],
    }),
  ],
};
