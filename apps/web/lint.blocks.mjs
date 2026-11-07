// The web app's own lint blocks (flat-config shape), read by eslint.config.js and by Oxlint
// (oxlint.full.config.ts): docs/31b-oxlint-mapping.md.
import {
  a11yRules,
  boundaries,
  forbiddenImports,
  noParentImports,
  reactRestrictions,
} from '@ab/config/lint';

const root = import.meta.dirname;

export default {
  react: true,
  blocks: [
    // docs/27 §1 rule 6: another feature only through its index.ts (existing deep imports: the
    // suppressions baseline).
    boundaries({
      root,
      files: ['src/**/*.{ts,tsx}'],
      module: 'src/features/[^/]+/[^/]+',
      alias: { '@/': 'src/' },
    }),
    // Owner 2026-10-30, docs/32 R12: `@/…`, never `../` (the sweep is
    // `pnpm imports:absolute -- web --write`).
    noParentImports({ root, files: ['src/**/*.{ts,tsx}'] }),
    // jsx-a11y recommended (role="admin" / "teacher" on our own components is a prop).
    { files: ['src/**/*.tsx'], rules: a11yRules },
    // React 19 + the React Compiler (vite.config.ts): no manual memo, effects in hooks. The React
    // 19 rules (forwardRef, useContext, .Provider) turn on once docs/32 x2–x5 remove the old uses.
    ...reactRestrictions({
      files: ['src/**/*.{ts,tsx}'],
      effects: ['src/**/*.tsx'],
      compiler: true,
      react19: false,
    }),
    // docs/32 R8: a component calls the API through a query or mutation hook, not apiFetch /
    // apiSend.
    forbiddenImports({
      files: ['src/**/*.tsx'],
      bans: [
        {
          regex: '(^|/)http/api(\\.js)?$',
          names: ['apiFetch', 'apiSend'],
          message: 'Call the API from a hook, not a component.',
        },
      ],
    }),
  ],
};
