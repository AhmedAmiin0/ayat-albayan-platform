// The lint blocks of every React DOM workspace (apps/staff-web, apps/family-web, packages/web-kit,
// docs/51 §2), so their lint.blocks.mjs are not clones.
import { boundaries, forbiddenImports, noParentImports } from './eslint-boundaries.js';
import { reactRestrictions } from './eslint-react.js';
import { a11yRules } from './jsx-a11y.js';

const SRC = ['src/**/*.{ts,tsx}'];
const TSX = ['src/**/*.tsx'];
const TS = ['src/**/*.ts'];
const HTTP_NAMES = ['apiFetch', 'apiSend'];
const HTTP_MESSAGE = 'Call the API from a hook, not a component.';
const HTTP = { regex: '(^|/)http/api(\\.js)?$', names: HTTP_NAMES, message: HTTP_MESSAGE };
const KIT_HTTP = { regex: '^@ab/web-kit$', names: HTTP_NAMES, message: HTTP_MESSAGE };
// The kit's `./*` export serves its own absolute imports and the tests' mock paths.
const KIT_PATHS = {
  regex: '^@ab/web-kit/(?!(room|testing)$)',
  message: "Import the kit from '@ab/web-kit', '@ab/web-kit/room' or '@ab/web-kit/testing'.",
};

/**
 * `module`: the folders that reach each other only through their index.ts (docs/27 §1 rule 6;
 * none for the kit, whose files are imported by path). Every block else is the same for all.
 */
export function webBlocks({ root, module }) {
  const fenced = module ? [boundaries({ root, files: SRC, module, alias: { '@/': 'src/' } })] : [];
  return [
    ...fenced,
    // docs/32 R12: `@/…` (the kit: `@ab/web-kit/…`), never `../`.
    noParentImports({ root, files: SRC }),
    // jsx-a11y recommended (role="admin" / "teacher" on our own components is a prop).
    { files: TSX, rules: a11yRules },
    // React 19 + the React Compiler (each app's Vite): no manual memo, effects in hooks. The React
    // 19 rules (forwardRef, useContext, .Provider) turn on once docs/32 x2–x5 remove the old uses.
    ...reactRestrictions({ files: SRC, effects: TSX, compiler: true, react19: false }),
    // docs/32 R8: a component calls the API through a query or mutation hook, not apiFetch /
    // apiSend.
    forbiddenImports({ files: TSX, bans: module ? [HTTP, KIT_HTTP, KIT_PATHS] : [HTTP] }),
    // docs/64 PR 5: an app reaches the kit through its entries only.
    ...(module ? [forbiddenImports({ files: TS, bans: [KIT_PATHS] })] : []),
  ];
}
