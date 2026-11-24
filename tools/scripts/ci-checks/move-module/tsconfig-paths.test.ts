import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRepo } from './fixture.test-util.ts';
import { loadAliases } from './resolve.ts';
import { workspacePaths } from './tsconfig-paths.ts';

const BASE = '{ "compilerOptions": { "paths": { "@/*": ["${configDir}/src/*"] } } }';
const EXTENDS = '{ // comment\n "extends": "../../tsconfig.base.json" }';

const root = makeRepo({
  'tsconfig.base.json': BASE,
  'apps/staff-mobile/tsconfig.json': EXTENDS,
  'apps/api/tsconfig.json': '{ "extends": "./tsconfig.app.json" }',
  'apps/api/tsconfig.app.json': EXTENDS,
  'apps/own/tsconfig.json':
    '{ "extends": "../../tsconfig.base.json",\n' +
    ' "compilerOptions": { "baseUrl": "lib", "paths": { "~/*": ["./x/*"] } } }',
  'packages/core/tsconfig.json': EXTENDS,
});

test('an app inherits the @/ path of the root base, ${configDir} being the app folder', () => {
  assert.deepEqual(workspacePaths(root, 'apps/staff-mobile'), [
    { key: '@/*', target: 'apps/staff-mobile/src/*' },
  ]);
});

test('follows a chain of relative extends and keeps the nearest paths', () => {
  assert.deepEqual(workspacePaths(root, 'apps/api'), [{ key: '@/*', target: 'apps/api/src/*' }]);
  assert.deepEqual(workspacePaths(root, 'apps/own'), [{ key: '~/*', target: 'apps/own/lib/x/*' }]);
});

test('a missing tsconfig has no paths', () => {
  assert.deepEqual(workspacePaths(root, 'apps/none'), []);
});

test('loadAliases gives apps the inherited alias and packages none', () => {
  const byScope = Object.fromEntries(loadAliases(root).map((a) => [a.scope, a]));
  assert.deepEqual(byScope['apps/staff-mobile'], {
    prefix: '@/',
    dir: 'apps/staff-mobile/src',
    scope: 'apps/staff-mobile',
  });
  assert.equal(byScope['apps/api']?.dir, 'apps/api/src');
  assert.equal(byScope['packages/core'], undefined);
});
