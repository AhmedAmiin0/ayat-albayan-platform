import { boundaries, config, TESTS } from '@ab/config/eslint';
// docs/27 §1 rule 6: another folder of the package only through its index.ts (existing deep
// imports: eslint-suppressions.json). src/index.ts is the package's public API and re-exports the
// folders. The folders lane K groups by target package (docs/32 k1: core, catalog, people,
// schedule) stay modules one level down.
export default config(
  import.meta.dirname,
  boundaries({ root: import.meta.dirname, files: ['src/**/*.ts'], module: 'src/(?:core|catalog|people|schedule)/[^/.]+|src/[^/.]+', ignores: ['src/index.ts'] }),
  { files: ['src/**/*.ts'], ignores: TESTS, rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' } },
);
