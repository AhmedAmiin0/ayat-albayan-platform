import { TESTS } from '@ab/config/lint';

const types = {
  files: ['src/**/*.ts'],
  ignores: TESTS,
  rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' },
};
export default { react: false, blocks: [types] };
