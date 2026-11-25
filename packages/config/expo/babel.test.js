import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { expoBabel } from './babel.js';
const APP = fileURLToPath(new URL('../../../apps/staff-mobile', import.meta.url));
const api = (caller) => ({ caller: (read) => read(caller) });
const named = (entry) => (typeof entry === 'string' ? entry : entry.name);

test('expoBabel resolves babel-preset-expo from the app and turns its own compiler off', () => {
  const { presets } = expoBabel(APP, false)(api({ name: 'metro' }));
  assert.equal(presets.length, 1);
  assert.match(presets[0][0], /babel-preset-expo/);
  assert.ok(presets[0][0].startsWith(join(APP, '..', '..', 'node_modules')));
  assert.deepEqual(presets[0][1], { 'react-compiler': false });
});

test('expoBabel adds the React Compiler for every caller only when the app switches it on', () => {
  const on = expoBabel(APP, true)(api({ name: 'metro' })).plugins.map(named);
  assert.equal(on.length, 1);
  assert.match(on[0], /babel-plugin-react-compiler/);
  assert.deepEqual(expoBabel(APP, undefined)(api({ name: 'metro' })).plugins, []);
});

test('expoBabel lets a caller without dynamic import (jest) compile import() to require', () => {
  const plugins = expoBabel(APP, false)(api({ supportsDynamicImport: false })).plugins;
  assert.equal(plugins.length, 1);
  assert.equal(plugins[0]().name, 'dynamic-import-to-require');
  const file = new Map();
  plugins[0]().pre.call({ file: { set: (k, v) => file.set(k, v) } });
  assert.equal(file.get('@babel/plugin-proposal-dynamic-import'), '7.27.1');
});

test('expoBabel fails loudly when the folder has no expo to resolve', () => {
  assert.throws(() => expoBabel('/', true));
});
