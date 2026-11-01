import { config, syntaxExempt } from '@ab/config/eslint';
// A CLI: console is its output. A test double: it calls the api with fetch (docs/36 H-1).
export default config(
  import.meta.dirname,
  { rules: { 'no-console': 'off' } },
  syntaxExempt({ files: ['**/*'], http: true }),
);
