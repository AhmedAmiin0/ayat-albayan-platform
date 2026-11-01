import { config, syntaxExempt } from '@ab/config/eslint';
// Logs are the test report; a Playwright call without await (no-floating-promises) is the classic flake.
// Test code: it calls the api and reads raw bodies on purpose (docs/36 H-1, Z-2 exempt tests).
export default config(
  import.meta.dirname,
  { rules: { 'no-console': 'off' } },
  syntaxExempt({ files: ['**/*'], http: true, shapes: true }),
);
