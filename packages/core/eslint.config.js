import { boundaries, config, syntaxExempt, TESTS } from '@ab/config/eslint';
// docs/27 §1 rule 6: each src/ folder is a module; others reach it only through its index.ts.
export default config(
  import.meta.dirname,
  boundaries({ root: import.meta.dirname, files: ['src/**/*.ts'], module: 'src/[^/.]+', ignores: ['src/index.ts'] }),
  { files: ['src/**/*.ts'], ignores: TESTS, rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' } },
  // docs/36 Z-2 «Stays exempt»: jsonOf is the one place a JSON string becomes data (z9).
  syntaxExempt({ files: ['src/schemas/json.ts'], shapes: true }),
);
