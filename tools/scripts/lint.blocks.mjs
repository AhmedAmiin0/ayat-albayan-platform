// A CLI: console is its output.
import { syntaxExempt } from '@ab/config/lint';

// docs/36 H-1 (row ht): tools/scripts' one outbound HTTP client is the only fetch caller.
const http = syntaxExempt({ files: ['http/**'], http: true });
export default { react: false, blocks: [{ rules: { 'no-console': 'off' } }, http] };
