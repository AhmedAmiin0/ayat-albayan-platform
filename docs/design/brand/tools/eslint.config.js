import { config } from '@ab/config/eslint';
// Brand asset scripts (docs/design/brand, docs/07 §11): CLIs, console is their output.
export default config(import.meta.dirname, { rules: { 'no-console': 'off' } });
