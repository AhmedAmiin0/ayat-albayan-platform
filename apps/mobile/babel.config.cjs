// React Compiler (owner 2026-10-30, docs/31a §3.2) for EVERY Babel caller: Metro (dev server, EAS Update, builds)
// and jest. babel-preset-expo compiles only when Metro passes supportsReactCompiler, which jest-expo never does, so
// the unit tests would run code that never ships. Here app.json `experiments.reactCompiler` is the one switch: the
// plugin runs first for every caller (plugins run before presets) with its defaults (target 19, node_modules
// skipped), and the preset's own copy is off so Metro does not compile twice.
const { dirname } = require('node:path');
const { expo } = require('./app.json');

// pnpm: neither is a dependency of this app; both come with expo (expo -> babel-preset-expo -> the compiler).
const near = (name, file) => require.resolve(name, { paths: [dirname(file)] });
const preset = near('babel-preset-expo', require.resolve('expo/package.json'));

module.exports = {
  presets: [[preset, { 'react-compiler': false }]],
  plugins: expo.experiments?.reactCompiler === true ? [near('babel-plugin-react-compiler', preset)] : [],
};
