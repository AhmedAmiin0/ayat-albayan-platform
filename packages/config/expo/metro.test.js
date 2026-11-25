import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { appAlias, metroConfig } from './metro.js';
const APP = '/repo/apps/family-mobile';
const echo = (_context, name) => name;

test('appAlias maps @/x to <app>/src/x and hands it to the next resolver', () => {
  assert.equal(appAlias(APP, echo)({}, '@/auth/session', 'android'), `${APP}/src/auth/session`);
});

test('appAlias leaves packages, relative paths and look-alike names unchanged', () => {
  const resolve = appAlias(APP, echo);
  assert.equal(resolve({}, '@ab/mobile-kit', 'ios'), '@ab/mobile-kit');
  assert.equal(resolve({}, './x', 'ios'), './x');
  assert.equal(resolve({}, '@/', 'ios'), `${APP}/src`);
  assert.equal(resolve({}, 'x/@/y', 'ios'), 'x/@/y');
});

test('appAlias passes the context and platform through untouched', () => {
  const calls = [];
  const context = { origin: 'a.ts' };
  appAlias(APP, (...args) => calls.push(args))(context, '@/x', 'web');
  assert.deepEqual(calls, [[context, `${APP}/src/x`, 'web']]);
});

test('metroConfig builds on the app’s own expo default and keeps its resolver behind the alias', async () => {
  const app = fileURLToPath(new URL('../../../apps/family-mobile', import.meta.url));
  const config = await metroConfig(app);
  assert.equal(config.projectRoot, app);
  assert.equal(typeof config.resolver.resolveRequest, 'function');
});
