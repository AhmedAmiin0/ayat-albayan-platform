import { boundaries, noRawEffect, reactConfig } from '@ab/config/eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
// docs/27 §1 rule 6: another feature only through its index.ts (existing deep imports: eslint-suppressions.json).
export default reactConfig(
  import.meta.dirname,
  boundaries({ root: import.meta.dirname, files: ['src/**/*.{ts,tsx}'], module: 'src/features/[^/]+/[^/]+', alias: { '@/': 'src/' } }),
  { ...jsxA11y.flatConfigs.recommended, files: ['src/**/*.tsx'] },
  noRawEffect(['src/**/*.tsx']),
);
