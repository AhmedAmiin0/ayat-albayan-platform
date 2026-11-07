// The linter-neutral part of the config: the blocks each package's lint.blocks.js composes (files,
// ignores and rules, in ESLint flat-config shape). eslint.js and oxlint/config.js both read them,
// so a package states its own rules once (docs/31b-oxlint-mapping.md).
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

/**
 * A library package's blocks: `module` folders reach each other only through their index.ts
 * (src/index.ts is the public API), and exported functions declare their types.
 */
export function libraryBlocks({ root, module }) {
  const types = { '@typescript-eslint/explicit-module-boundary-types': 'error' };
  return [
    boundaries({ root, files: ['src/**/*.ts'], module, ignores: ['src/index.ts'] }),
    { files: ['src/**/*.ts'], ignores: TESTS, rules: types },
  ];
}
