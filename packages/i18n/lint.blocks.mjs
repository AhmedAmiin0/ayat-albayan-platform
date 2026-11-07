// One flat module (docs/32 §4 @ab/i18n): the UI-string helpers. The JSON bundles stay in shared.
import { TESTS } from '@ab/config/lint';

const types = {
  files: ['src/**/*.ts'],
  ignores: TESTS,
  rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' },
};
export default { react: false, blocks: [types] };
