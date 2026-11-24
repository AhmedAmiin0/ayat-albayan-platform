// The Babel config of every Expo app here and of this package's jest (owner 2026-10-30,
// docs/31a §3.2: the React Compiler for EVERY Babel caller). babel-preset-expo compiles only
// when Metro passes supportsReactCompiler, which jest-expo never does, so the unit tests would run
// code that never ships: the app.json `experiments.reactCompiler` switch adds the plugin here for
// every caller (plugins run before presets) with its defaults (target 19, node_modules skipped),
// and the preset's own copy is off so Metro does not compile twice.
const { dirname } = require('node:path');

// pnpm: neither is a dependency; both come with expo (expo -> babel-preset-expo -> the compiler).
const near = (name, file) => require.resolve(name, { paths: [dirname(file)] });
const preset = near('babel-preset-expo', require.resolve('expo/package.json'));

/*
 * Metro turns `import()` into a require-backed promise. babel-jest declares its runtime has no
 * dynamic import (no vm modules) and babel-preset-expo adds no transform for it. For a caller that
 * says so, this sets the flag @babel/plugin-transform-dynamic-import sets: the preset's CommonJS
 * transform then rewrites `import()` too, and jest loads the native modules the way the app does.
 */
const lacksDynamicImport = (caller) => caller?.supportsDynamicImport === false;
const dynamicImportToRequire = () => ({
  name: 'dynamic-import-to-require',
  pre() {
    this.file.set('@babel/plugin-proposal-dynamic-import', '7.27.1');
  },
});

/** `reactCompiler`: the app's app.json `expo.experiments.reactCompiler`. */
module.exports = (reactCompiler) => (api) => ({
  presets: [[preset, { 'react-compiler': false }]],
  plugins: [
    ...(reactCompiler === true ? [near('babel-plugin-react-compiler', preset)] : []),
    ...(api.caller(lacksDynamicImport) ? [dynamicImportToRequire] : []),
  ],
});
