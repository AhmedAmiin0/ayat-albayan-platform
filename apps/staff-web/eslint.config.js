import { reactConfig } from '@ab/config/eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import lint from './lint.blocks.mjs';

// The web app's own blocks live in lint.blocks.mjs (shared with Oxlint); ESLint registers the
// jsx-a11y plugin (and its JSX parser options) for the a11y block there.
const { plugins, languageOptions } = jsxA11y.flatConfigs.recommended;
export default reactConfig(
  import.meta.dirname,
  { files: ['src/**/*.tsx'], plugins, languageOptions },
  ...lint.blocks,
);
