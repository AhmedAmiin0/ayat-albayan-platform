import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRepo } from './fixture.test-util.ts';
import { selfExportPaths } from './package-self.ts';
import { formatSpec, loadAliases } from './resolve.ts';

const WILD = { types: ['./src/*.ts'], default: './src/*' };
const root = makeRepo({
  'packages/web-kit/package.json': JSON.stringify({
    name: '@ab/web-kit',
    exports: { './*': WILD },
  }),
  'packages/mobile-kit/package.json': JSON.stringify({
    name: '@ab/mobile-kit',
    exports: { '.': './src/index.ts' },
  }),
  'packages/plain/package.json': JSON.stringify({
    name: '@ab/plain',
    exports: { './*': './src/*' },
  }),
});

test("a package's `./*` export is its own absolute import path", () => {
  assert.deepEqual(selfExportPaths(root, 'packages/web-kit'), [
    { key: '@ab/web-kit/*', target: 'packages/web-kit/src/*' },
  ]);
  assert.deepEqual(selfExportPaths(root, 'packages/plain'), [
    { key: '@ab/plain/*', target: 'packages/plain/src/*' },
  ]);
});

test('no `./*` export, or no package.json: no path', () => {
  assert.deepEqual(selfExportPaths(root, 'packages/mobile-kit'), []);
  assert.deepEqual(selfExportPaths(root, 'packages/none'), []);
});

test('a kit file moved deeper imports its kit by the package name, never `../`', () => {
  const aliases = loadAliases(root);
  const from = 'packages/web-kit/src/ui/Form/Form.tsx';
  const target = { file: 'packages/web-kit/src/ui/Button/index.ts', style: 'index' as const };
  assert.equal(formatSpec(target, { from, file: target.file, aliases }), '@ab/web-kit/ui/Button');
});
