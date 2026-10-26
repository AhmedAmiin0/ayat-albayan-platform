import { boundaries, reactConfig } from '@ab/config/eslint';
// docs/27 §1 rule 6: another feature only through its index.ts (existing deep imports: eslint-suppressions.json).
export default reactConfig(
  boundaries({ root: import.meta.dirname, files: ['src/**/*.{ts,tsx}'], module: 'src/features/[^/]+/[^/]+', alias: { '@/': 'src/' } }),
);
