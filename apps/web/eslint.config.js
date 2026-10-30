import { boundaries, reactConfig, reactRestrictions } from '@ab/config/eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
// docs/27 §1 rule 6: another feature only through its index.ts (existing deep imports: eslint-suppressions.json).
export default reactConfig(
  import.meta.dirname,
  boundaries({ root: import.meta.dirname, files: ['src/**/*.{ts,tsx}'], module: 'src/features/[^/]+/[^/]+', alias: { '@/': 'src/' } }),
  {
    ...jsxA11y.flatConfigs.recommended,
    files: ['src/**/*.tsx'],
    // role="admin" / "teacher" on our own components is a prop, not an ARIA role.
    rules: { ...jsxA11y.flatConfigs.recommended.rules, 'jsx-a11y/aria-role': ['error', { ignoreNonDOM: true }] },
  },
  // React 18 + the React Compiler (vite.config.ts, target 18): no manual memo, effects in hooks. The React 19
  // rules (forwardRef, useContext, .Provider) come with the React 19 upgrade.
  ...reactRestrictions({ files: ['src/**/*.{ts,tsx}'], effects: ['src/**/*.tsx'], react19: false }),
);
