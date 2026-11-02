import { boundaries, config, TESTS } from '@ab/config/eslint';
// docs/27 §1 rule 6: another folder of the package only through its index.ts (existing deep
// imports: eslint-suppressions.json). src/index.ts is the package's public API and re-exports the
// folders. The folders lane K groups by target package (docs/32 k1: core, people) stay modules one
// level down. k1e nests numbers/ under messaging/: it stays its own module there. catalog/,
// settings/, money/ and schedule/ hold only the tests that read the i18n JSON or compose other
// shared folders (k4 cut @ab/catalog and @ab/settings, k5a @ab/money and @ab/schedule).
export default config(
  import.meta.dirname,
  boundaries({ root: import.meta.dirname, files: ['src/**/*.ts'], module: 'src/(?:core|people)/[^/.]+|src/messaging/numbers|src/[^/.]+', ignores: ['src/index.ts'] }),
  { files: ['src/**/*.ts'], ignores: TESTS, rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' } },
);
