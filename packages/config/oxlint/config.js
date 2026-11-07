// The whole ESLint setup of eslint.js as ONE Oxlint config (oxlint.full.config.ts at the repo
// root): the .oxlintrc.json rules, then per package the base rules of config() / reactConfig()
// and the package's own lint.blocks.js, each scoped to its folder (docs/31b-oxlint-mapping.md).
import { createRequire } from 'node:module';
import { TESTS } from '../eslint-boundaries.js';
import { toOverrides } from './convert.js';
import { REACT_BLOCK } from './react.js';
import { ALL, JS_ONLY, PLAIN_TS, TEST_OFF } from './rules.js';
import { TYPED, TYPED_TEST_OFF } from './typed.js';

export { oxlintName } from './convert.js';

const require = createRequire(import.meta.url);
const off = (rules) => Object.fromEntries(rules.map((rule) => [rule, 'off']));

// test-results: Playwright rewrites it while lint runs (ENOENT race).
const IGNORES = [
  '**/dist/**',
  '**/coverage/**',
  '**/*.gen.ts',
  '**/.expo/**',
  '**/playwright-report/**',
  '**/test-results/**',
];
const JS = '**/*.{js,mjs,cjs}';

/** eslint.js config() (and reactConfig()) before the package's own blocks. */
const baseBlocks = (react) => [
  { files: ['**/*'], rules: { ...ALL, ...TYPED } },
  { files: ['**/*.ts'], rules: PLAIN_TS },
  // typescript-eslint's eslint-recommended turns these off for .ts/.tsx/.mts/.cts only.
  { files: ['**/*.{js,mjs,cjs,jsx}'], rules: JS_ONLY },
  { files: TESTS, rules: off([...TEST_OFF, ...TYPED_TEST_OFF]) },
  { files: [...TESTS, 'src/time/**'], rules: off(['no-restricted-properties']) },
  ...(react ? [REACT_BLOCK] : []),
];

/**
 * One package: `dir` (repo-relative folder), `react` (reactConfig) and `blocks` (its
 * lint.blocks.js); last, plain JS files lose the type-aware rules (disableTypeChecked).
 */
export function packageOverrides({ dir, react, blocks }) {
  const all = [...baseBlocks(react), ...blocks, { files: [JS], rules: off(Object.keys(TYPED)) }];
  return toOverrides(dir, all);
}

const JS_PLUGINS = [
  { name: 'ab', specifier: new URL('./ab-plugin.js', import.meta.url).pathname },
  { name: 'stylistic', specifier: require.resolve('@stylistic/eslint-plugin') },
  { name: 'react-hooks-js', specifier: require.resolve('eslint-plugin-react-hooks') },
];

/** The root config: `oxlintrc` (.oxlintrc.json) plus every package of `packages`. */
export function compose({ oxlintrc, packages }) {
  const parts = packages.map(packageOverrides);
  return {
    plugins: ['typescript', 'react', 'jsx-a11y'],
    jsPlugins: JS_PLUGINS,
    categories: oxlintrc.categories,
    env: { builtin: true, node: true },
    options: { typeAware: true, reportUnusedDisableDirectives: 'error' },
    ignorePatterns: [...IGNORES, ...parts.flatMap((part) => part.ignorePatterns)],
    rules: oxlintrc.rules,
    overrides: [...oxlintrc.overrides, ...parts.flatMap((part) => part.overrides)],
  };
}
