import { config, TESTS } from '@ab/config/eslint';
// One flat module (docs/32 §4 @ab/i18n): the UI-string helpers. The JSON bundles stay in shared.
export default config(
  import.meta.dirname,
  { files: ['src/**/*.ts'], ignores: TESTS, rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' } },
);
