import { boundaries, config } from '@ab/config/eslint';
// docs/27 §1 rule 6: another folder of the package only through its index.ts (existing deep imports:
// eslint-suppressions.json). src/index.ts is the package's public API and re-exports the folders.
export default config(
  boundaries({ root: import.meta.dirname, files: ['src/**/*.ts'], module: 'src/[^/.]+', ignores: ['src/index.ts'] }),
);
