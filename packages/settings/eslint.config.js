import { boundaries, config, TESTS } from '@ab/config/eslint';
// docs/27 §1 rule 6, as in @ab/shared before k4: the settings kernel (src/*.ts, domains/, seed/,
// validation/) is one module, and custom-config/ is its own; others reach it through its index.ts.
export default config(
  import.meta.dirname,
  boundaries({ root: import.meta.dirname, files: ['src/**/*.ts'], module: 'src/custom-config', ignores: ['src/index.ts'] }),
  { files: ['src/**/*.ts'], ignores: TESTS, rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' } },
);
