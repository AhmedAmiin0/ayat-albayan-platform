import { config } from '@ab/config/eslint';
// Logs are the test report; a Playwright call without await (no-floating-promises) is the classic flake.
export default config(import.meta.dirname, { rules: { 'no-console': 'off' } });
