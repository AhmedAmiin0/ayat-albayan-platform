import { config } from '@ab/config/eslint';
// A CLI: console is its output.
export default config(import.meta.dirname, { rules: { 'no-console': 'off' } });
