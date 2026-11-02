import { config, syntaxExempt } from '@ab/config/eslint';
// A CLI: console is its output.
export default config(
  import.meta.dirname,
  { rules: { 'no-console': 'off' } },
  // docs/36 H-1 (row ht): tools/scripts' one outbound HTTP client is the only fetch caller.
  syntaxExempt({ files: ['http/**'], http: true }),
);
