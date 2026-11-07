// A CLI: console is its output. A test double: it calls the api with fetch (docs/36 H-1).
import { syntaxExempt } from '@ab/config/lint';

export default {
  react: false,
  blocks: [{ rules: { 'no-console': 'off' } }, syntaxExempt({ files: ['**/*'], http: true })],
};
