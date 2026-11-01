import { boundaries, config, TESTS } from '@ab/config/eslint';
// docs/27 §1 rule 6: each src/ folder is a module; others reach it only through its index.ts.
export default config(
  import.meta.dirname,
  boundaries({ root: import.meta.dirname, files: ['src/**/*.ts'], module: 'src/[^/.]+', ignores: ['src/index.ts'] }),
  { files: ['src/**/*.ts'], ignores: TESTS, rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' } },
);
