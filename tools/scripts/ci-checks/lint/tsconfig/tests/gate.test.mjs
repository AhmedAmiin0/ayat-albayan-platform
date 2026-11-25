import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isTsconfig, violations } from '../gate.mjs';

const check = (config, path = 'apps/api/tsconfig.json') => violations(path, JSON.stringify(config));

test('isTsconfig: tsconfig.json and tsconfig.*.json anywhere, nothing in node_modules', () => {
  assert.equal(isTsconfig('tsconfig.json'), true);
  assert.equal(isTsconfig('apps/api/tsconfig.build.json'), true);
  assert.equal(isTsconfig('packages/config/tsconfig/base.json'), false);
  assert.equal(isTsconfig('apps/api/tsconfig.json.bak'), false);
  assert.equal(isTsconfig('apps/api/my-tsconfig.json'), false);
  assert.equal(isTsconfig('node_modules/x/tsconfig.json'), false);
  assert.equal(isTsconfig('apps/api/node_modules/x/tsconfig.json'), false);
});

test('a config that names only its own folder and the root base passes', () => {
  const own = {
    extends: '../../tsconfig.base.json',
    compilerOptions: { strict: true, types: ['jest'] },
    include: ['src', '**/*.tsx', './vite.config.ts'],
    exclude: ['src/**/*.test.ts'],
    files: ['src/env.d.ts'],
  };
  assert.deepEqual(check(own), []);
  assert.deepEqual(check({ extends: './tsconfig.json' }, 'apps/api/tsconfig.build.json'), []);
});

test('jsonc: comments and trailing commas parse', () => {
  const text = '{\n  // own folder only\n  "include": ["src",],\n}';
  assert.deepEqual(violations('apps/api/tsconfig.json', text), []);
});

test('references, rootDirs, typeRoots and baseUrl each fail, even when empty', () => {
  assert.deepEqual(check({ references: [] }), [
    'references: link apps and packages in package.json',
  ]);
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

const NOT_BASE = 'is not its own folder, the root tsconfig.base.json or a kind config';

test('extends: the root tsconfig.base.json passes from any depth', () => {
  assert.deepEqual(check({ extends: '../../tsconfig.base.json' }), []);
  assert.deepEqual(check({ extends: '../tsconfig.base.json' }, 'e2e/tsconfig.json'), []);
  assert.deepEqual(check({ extends: '../../tsconfig.base.json' }, 'tools/x/tsconfig.json'), []);
});

test('extends: a file outside the folder or any package fails, presets included', () => {
  const config = {
    extends: [
      '../../packages/config/tsconfig/base.json',
      '@ab/web-kit/tsconfig.json',
      '@ab/config/tsconfig/base.json',
      '@ab/config/tsconfig/react.json',
      'expo/tsconfig.base',
      '@tsconfig/node20/tsconfig.json',
      './tsconfig.json',
    ],
  };
  assert.deepEqual(check(config), [
    `extends: "../../packages/config/tsconfig/base.json" ${NOT_BASE}`,
    `extends: "@ab/web-kit/tsconfig.json" ${NOT_BASE}`,
    `extends: "@ab/config/tsconfig/base.json" ${NOT_BASE}`,
    `extends: "@ab/config/tsconfig/react.json" ${NOT_BASE}`,
    `extends: "expo/tsconfig.base" ${NOT_BASE}`,
    `extends: "@tsconfig/node20/tsconfig.json" ${NOT_BASE}`,
  ]);
});

test('extends: a tsconfig.base.json that is not the root one fails', () => {
  assert.deepEqual(check({ extends: '../tsconfig.base.json' }), [
    `extends: "../tsconfig.base.json" ${NOT_BASE}`,
  ]);
  assert.deepEqual(check({ extends: '../../../tsconfig.base.json' }), [
    `extends: "../../../tsconfig.base.json" ${NOT_BASE}`,
  ]);
  assert.deepEqual(check({ extends: '../../tsconfig.json' }), [
    `extends: "../../tsconfig.json" ${NOT_BASE}`,
  ]);
});

test('extends: a bare relative name without ./ is resolved as a package, so it fails', () => {
  assert.deepEqual(check({ extends: 'tsconfig.json' }), [`extends: "tsconfig.json" ${NOT_BASE}`]);
});

const ALIAS = { '@/*': ['${configDir}/src/*'] };
const PATHS =
  'compilerOptions.paths: only tsconfig.base.json at the root, exactly {"@/*":["${configDir}/src/*"]}';

test('paths: the root tsconfig.base.json may hold exactly the @/ alias', () => {
  assert.deepEqual(check({ compilerOptions: { paths: ALIAS } }, 'tsconfig.base.json'), []);
});

test('paths: any other value in the root base fails', () => {
  const others = [
    { '@/*': ['./src/*'] },
    { '@/*': ['${configDir}/src/*', './src/*'] },
    { ...ALIAS, '@ab/web-kit/*': ['./packages/web-kit/src/*'] },
    {},
  ];
  others.forEach((paths) =>
    assert.deepEqual(check({ compilerOptions: { paths } }, 'tsconfig.base.json'), [PATHS]),
  );
});

test('paths: every other tsconfig fails, even with the same alias or none', () => {
  const where = ['apps/api/tsconfig.json', 'e2e/tsconfig.json', 'tools/x/tsconfig.json'];
  where.forEach((path) => {
    assert.deepEqual(check({ compilerOptions: { paths: ALIAS } }, path), [PATHS]);
    assert.deepEqual(check({ compilerOptions: { paths: {} } }, path), [PATHS]);
  });
  const kit = check({ compilerOptions: { paths: ALIAS } }, 'packages/web-kit/tsconfig.json');
  assert.equal(kit.includes(PATHS), true);
  const nested = 'apps/api/tsconfig.base.json';
  assert.deepEqual(check({ compilerOptions: { paths: ALIAS } }, nested), [PATHS]);
});

test('baseUrl fails in the root base too', () => {
  const config = { compilerOptions: { baseUrl: '.', paths: ALIAS } };
  assert.deepEqual(check(config, 'tsconfig.base.json'), [
    'compilerOptions.baseUrl: link apps and packages in package.json',
  ]);
});

test('a malformed field fails the parse instead of passing silently', () => {
  assert.throws(() => check({ include: 'src' }));
});
