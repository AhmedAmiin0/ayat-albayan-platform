import { boundaries, config, TESTS } from '@ab/config/eslint';
// docs/27 §1 rule 6: another folder of the package only through its index.ts (existing deep imports:
// eslint-suppressions.json). src/index.ts is the package's public API and re-exports the folders.
// docs/32 d5 groups the folders as src/<group>/<folder>; a folder still directly under src/, or a
// loose file in a group, belongs to src/<name>.
const MODULE = 'src/(?:core|messaging|people|teaching|finance)/[^/.]+|src/[^/.]+';
export default config(
  import.meta.dirname,
  boundaries({ root: import.meta.dirname, files: ['src/**/*.ts'], module: MODULE, ignores: ['src/index.ts'] }),
  { files: ['src/**/*.ts'], ignores: TESTS, rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' } },
);
