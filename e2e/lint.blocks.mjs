// Logs are the test report; a Playwright call without await (no-floating-promises) is the
// classic flake.
// Test code: it calls the api and reads raw bodies on purpose (docs/36 H-1, Z-2 exempt tests).
import { syntaxExempt } from '@ab/config/lint';

const tests = syntaxExempt({ files: ['**/*'], http: true, shapes: true });
export default { react: false, blocks: [{ rules: { 'no-console': 'off' } }, tests] };
