// The blocks each package's lint.blocks.mjs composes (files, ignores and rules, in flat-config
// shape); oxlint/config.js converts them, so a package states its own rules once
// (docs/31b-oxlint-mapping.md).
import { boundaries, TESTS } from './eslint-boundaries.js';

export {
  boundaries,
  forbiddenImports,
  noParentImports,
  TESTS,
  zodInputs,
} from './eslint-boundaries.js';
export { domainModuleRegex, routeImportGroup } from './eslint-domains.js';
export { reactRestrictions } from './eslint-react.js';
export { SYNTAX, syntaxExempt } from './eslint-syntax.js';
export { a11yRules } from './jsx-a11y.js';
export { webBlocks } from './lint-web.js';

/** Exported functions in src declare their types. */
export const exportTypes = {
  files: ['src/**/*.ts'],
  ignores: TESTS,
  rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' },
};

/**
 * A library package's blocks: `module` folders reach each other only through their index.ts
 * (src/index.ts is the public API), and exported functions declare their types.
 */
export function libraryBlocks({ root, module }) {
  return [
    boundaries({ root, files: ['src/**/*.ts'], module, ignores: ['src/index.ts'] }),
    exportTypes,
  ];
}
