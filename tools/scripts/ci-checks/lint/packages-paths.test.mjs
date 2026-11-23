import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRepo, table } from './testing/packages-fixture.test-util.mjs';
import { judge } from './packages-rules.mjs';
import { scan } from './packages-scan.mjs';

const KIT = { 'packages/web-kit/src/a.ts': '', 'packages/web-kit/public/x.png': '' };
const keys = (files) => [...judge(table(), scan(makeRepo({ ...KIT, ...files }))).extras.keys()];

test("config's '../web-kit/src' literal is a path extra", () => {
  const files = { 'packages/config/vite.js': "export const KIT = new URL('../web-kit/src', 'x');" };
  assert.deepEqual(keys(files), ['@ab/config → @ab/web-kit (path)']);
});

test("'../' to the repo root, a missing folder or the file's own workspace is ignored", () => {
  const files = {
    'packages/time/src/a.ts': "export const p = ['../../..', '../../nope/x', '../src'];",
  };
  assert.deepEqual(keys(files), []);
});

test("a root-relative 'packages/web-kit/public/x.png' in an api file is api → web-kit", () => {
  const files = {
    'apps/api/src/a.ts': "export const LOGO = join(root, 'packages/web-kit/public/x.png');",
  };
  assert.deepEqual(keys(files), ['api → @ab/web-kit (path)']);
});

test('a literal in tools/ or in a test is not counted', () => {
  const files = {
    'tools/wa-stub/src/a.ts': "export const p = '../../../packages/web-kit/src';",
    'apps/api/src/a.test.ts': "const p = 'packages/web-kit/public/x.png';",
  };
  assert.deepEqual(keys(files), []);
});

test('tsconfig references and paths, <rootDir>/ and /// <reference path> land in workspaces', () => {
  const files = {
    'apps/api/tsconfig.json':
      '{ // jsonc\n "references": [{ "path": "../../packages/mobile-kit" }] }',
    'packages/mobile-kit/src/a.ts': '',
    'packages/time/jest.config.js': "export default { roots: ['<rootDir>/../web-kit/src'] };",
    'packages/core/src/a.ts': '/// <reference path="../../time/src/env.d.ts" />\n',
    'packages/time/src/env.d.ts': '',
  };
  assert.deepEqual(keys(files).sort(), [
    '@ab/core → @ab/time (path)',
    '@ab/time → @ab/web-kit (path)',
    'api → @ab/mobile-kit (path)',
  ]);
});

test("e2e's pathReach admits a literal into an app", () => {
  const v = judge(
    table(),
    scan(makeRepo({ 'e2e/a.ts': "export const p = '../apps/api/src';", 'apps/api/src/a.ts': '' })),
  );
  assert.deepEqual([v.fatal, [...v.extras.keys()]], [[], []]);
});
