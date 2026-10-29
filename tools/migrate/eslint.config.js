import { config } from '@ab/config/eslint';
// A CLI: console is its output.
export default config(import.meta.dirname, { ignores: ['cache/**', 'out/**'] }, { rules: { 'no-console': 'off' } });
