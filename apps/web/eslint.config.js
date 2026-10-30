import { boundaries, forbiddenImports, noParentImports, reactConfig, reactRestrictions } from '@ab/config/eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';

// docs/27 §1 rule 6: another feature only through its index.ts (existing deep imports: eslint-suppressions.json).
export default reactConfig(
  import.meta.dirname,
  boundaries({ root: import.meta.dirname, files: ['src/**/*.{ts,tsx}'], module: 'src/features/[^/]+/[^/]+', alias: { '@/': 'src/' } }),
  // Owner 2026-10-30, docs/32 R12: `@/…`, never `../` (existing ones: eslint-suppressions.json; the
  // sweep is `pnpm imports:absolute -- web --write`).
  noParentImports({ root: import.meta.dirname, files: ['src/**/*.{ts,tsx}'] }),
  {
    ...jsxA11y.flatConfigs.recommended,
    files: ['src/**/*.tsx'],
    // role="admin" / "teacher" on our own components is a prop, not an ARIA role.
    rules: { ...jsxA11y.flatConfigs.recommended.rules, 'jsx-a11y/aria-role': ['error', { ignoreNonDOM: true }] },
  },
  // React 19 + the React Compiler (vite.config.ts): no manual memo, effects in hooks. The React 19
  // rules (forwardRef, useContext, .Provider) turn on once docs/32 x2–x5 remove the old uses.
  ...reactRestrictions({ files: ['src/**/*.{ts,tsx}'], effects: ['src/**/*.tsx'], compiler: true, react19: false }),
  // docs/32 R8: a component calls the API through a query or mutation hook, not apiFetch / apiSend
  // (existing ones: eslint-suppressions.json).
  forbiddenImports({
    files: ['src/**/*.tsx'],
    bans: [{ regex: '(^|/)http/api(\\.js)?$', names: ['apiFetch', 'apiSend'], message: 'Call the API from a hook, not a component.' }],
  }),
);
