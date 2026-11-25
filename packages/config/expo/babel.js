// The Babel config of every Expo app here and of mobile-kit's jest (docs/31a §3.2: the
// React Compiler for EVERY Babel caller). babel-preset-expo compiles only
// when Metro passes supportsReactCompiler, which jest-expo never does, so the unit tests would run
// code that never ships: the app.json `experiments.reactCompiler` switch adds the plugin here for
// every caller (plugins run before presets) with its defaults (target 19, node_modules skipped),
// and the preset's own copy is off so Metro does not compile twice.
import { createRequire } from 'node:module';
import { join } from 'node:path';

// pnpm: neither is a dependency of the app; both come with expo (expo -> babel-preset-expo ->
// the compiler), so expo is found from the app's folder and the rest from expo's.
const near = (name, file) => createRequire(file).resolve(name);

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

/** `appDir`: the folder whose expo builds; `reactCompiler`: its app.json switch. */
export const expoBabel = (appDir, reactCompiler) => {
  const preset = near('babel-preset-expo', near('expo/package.json', join(appDir, 'package.json')));
  return (api) => ({
    presets: [[preset, { 'react-compiler': false }]],
    plugins: [
      ...(reactCompiler === true ? [near('babel-plugin-react-compiler', preset)] : []),
      ...(api.caller(lacksDynamicImport) ? [dynamicImportToRequire] : []),
    ],
  });
};
