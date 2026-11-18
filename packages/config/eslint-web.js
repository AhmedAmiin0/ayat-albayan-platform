// The ESLint config of every React DOM workspace (apps/staff-web, apps/family-web,
// packages/web-kit, docs/51 §2): the React base, jsx-a11y registered (plugin and JSX parser
// options) for the a11y block of webBlocks, then the workspace's own lint.blocks.mjs.
import jsxA11y from 'eslint-plugin-jsx-a11y';
import { reactConfig } from './eslint.js';

const { plugins, languageOptions } = jsxA11y.flatConfigs.recommended;

/** `root`: the workspace (import.meta.dirname); `blocks`: its lint.blocks.mjs blocks. */
export function webReactConfig(root, blocks) {
  return reactConfig(root, { files: ['src/**/*.tsx'], plugins, languageOptions }, ...blocks);
}
