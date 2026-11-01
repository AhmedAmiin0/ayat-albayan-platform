import { boundaries, config, TESTS } from '@ab/config/eslint';
// docs/27 §1 rule 6: another folder of the package only through its index.ts (existing deep
// imports: eslint-suppressions.json). src/index.ts is the package's public API and re-exports the
// folders. The folders lane K groups by target package (docs/32 k1: core, people, schedule) stay
// modules one level down; so do the four k1d puts under money/ (today's money/ moves to
// money/ledger, so its own earnings/ and usage/ stay inside one module until then). k1e nests
// numbers/ under messaging/: it stays its own module there. catalog/ and settings/ hold only the
// tests that read the i18n JSON (k4 cut @ab/catalog and @ab/settings).
export default config(
  import.meta.dirname,
  boundaries({ root: import.meta.dirname, files: ['src/**/*.ts'], module: 'src/(?:core|people|schedule)/[^/.]+|src/money/(?:ledger|pricing|assistant|status-style)|src/messaging/numbers|src/[^/.]+', ignores: ['src/index.ts'] }),
  { files: ['src/**/*.ts'], ignores: TESTS, rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' } },
);
