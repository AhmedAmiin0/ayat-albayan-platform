import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isTsconfig, violations } from './gate.mjs';

const check = (config, path = 'apps/api/tsconfig.json') =>
  violations(path, JSON.stringify(config));

test('isTsconfig: tsconfig.json and tsconfig.*.json anywhere, nothing in node_modules', () => {
  assert.equal(isTsconfig('tsconfig.json'), true);
  assert.equal(isTsconfig('apps/api/tsconfig.build.json'), true);
  assert.equal(isTsconfig('packages/config/tsconfig/base.json'), false);
  assert.equal(isTsconfig('apps/api/tsconfig.json.bak'), false);
  assert.equal(isTsconfig('apps/api/my-tsconfig.json'), false);
  assert.equal(isTsconfig('node_modules/x/tsconfig.json'), false);
  assert.equal(isTsconfig('apps/api/node_modules/x/tsconfig.json'), false);
});

test('a config that names only its own folder and a shared preset passes', () => {
  const own = {
    extends: '@ab/config/tsconfig/nest.json',
    compilerOptions: { strict: true, types: ['jest'] },
    include: ['src', '**/*.tsx', './vite.config.ts'],
    exclude: ['src/**/*.test.ts'],
    files: ['src/env.d.ts'],
  };
  assert.deepEqual(check(own), []);
  assert.deepEqual(check({ extends: './tsconfig.json' }, 'apps/api/tsconfig.build.json'), []);
  assert.deepEqual(check({ extends: 'expo/tsconfig.base' }), []);
});

test('jsonc: comments and trailing commas parse', () => {
  const text = '{\n  // own folder only\n  "include": ["src",],\n}';
  assert.deepEqual(violations('apps/api/tsconfig.json', text), []);
});

test('references, rootDirs, typeRoots and baseUrl each fail, even when empty', () => {
  assert.deepEqual(check({ references: [] }), ['references: link apps and packages in package.json']);
  const options = { rootDirs: ['src'], typeRoots: ['./types'], baseUrl: '.' };
  assert.deepEqual(check({ compilerOptions: options }), [
    'compilerOptions.rootDirs: link apps and packages in package.json',
    'compilerOptions.typeRoots: link apps and packages in package.json',
    'compilerOptions.baseUrl: link apps and packages in package.json',
  ]);
});

test('include, files and exclude entries that leave the folder fail', () => {
  const config = {
    include: ['src', '../../packages/mobile-kit/assets/images.d.ts'],
    files: ['src/../../x.d.ts', '/abs/x.d.ts'],
    exclude: ['packages/web-kit/src', './apps/x'],
  };
  assert.deepEqual(check(config), [
    'include: "../../packages/mobile-kit/assets/images.d.ts" leaves its own folder',
    'files: "src/../../x.d.ts" leaves its own folder',
    'files: "/abs/x.d.ts" leaves its own folder',
    'exclude: "packages/web-kit/src" leaves its own folder',
    'exclude: "./apps/x" leaves its own folder',
  ]);
});

test('extends: a file outside the folder, another package or an unknown preset fails', () => {
  const config = {
    extends: [
      '../../packages/config/tsconfig/base.json',
      '@ab/web-kit/tsconfig.json',
      '@ab/config/tsconfig/nested/x.json',
      '@tsconfig/node20/tsconfig.json',
      './tsconfig.json',
      '@ab/config/tsconfig/react.json',
    ],
  };
  assert.deepEqual(check(config), [
    'extends: "../../packages/config/tsconfig/base.json" is not its own folder or a preset',
    'extends: "@ab/web-kit/tsconfig.json" is not its own folder or a preset',
    'extends: "@ab/config/tsconfig/nested/x.json" is not its own folder or a preset',
    'extends: "@tsconfig/node20/tsconfig.json" is not its own folder or a preset',
  ]);
});

test('extends: a bare relative name without ./ is resolved as a package, so it fails', () => {
  assert.deepEqual(check({ extends: 'tsconfig.json' }), [
    'extends: "tsconfig.json" is not its own folder or a preset',
  ]);
});

test('paths is not checked yet', () => {
  assert.deepEqual(check({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }), []);
});

test('a malformed field fails the parse instead of passing silently', () => {
  assert.throws(() => check({ include: 'src' }));
});
