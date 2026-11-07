// The React flavour (eslint.js reactConfig): eslint-plugin-react-hooks' recommended-latest preset,
// every rule an error (the React Compiler's included), browser globals and async JSX handlers.
// Oxlint runs its native port of each rule; `config` and `gating` (no native port) run the
// plugin itself as the `react-hooks-js` JS plugin (docs/31b-oxlint-mapping.md).

const NATIVE = [
  'error-boundaries',
  'exhaustive-deps',
  'globals',
  'immutability',
  'incompatible-library',
  'no-deriving-state-in-effects',
  'preserve-manual-memoization',
  'purity',
  'refs',
  'rules-of-hooks',
  'set-state-in-effect',
  'set-state-in-render',
  'static-components',
  'unsupported-syntax',
  'use-memo',
  'void-use-memo',
];
const PLUGIN = ['config', 'gating'];

export const REACT_BLOCK = {
  files: ['**/*'],
  env: { browser: true },
  rules: {
    ...Object.fromEntries(NATIVE.map((rule) => [`react/${rule}`, 'error'])),
    ...Object.fromEntries(PLUGIN.map((rule) => [`react-hooks-js/${rule}`, 'error'])),
    // async onPress / onClick handlers are fine.
    'typescript/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
  },
};
