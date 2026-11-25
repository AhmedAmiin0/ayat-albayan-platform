import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kitExportsFailure } from './kit-exports.mjs';

const FILE = 'packages/web-kit/package.json';
const pkg = (exports, extra = {}) => JSON.stringify({ name: '@ab/web-kit', ...extra, exports });
const BASE = pkg({ '.': './src/index.ts', './x': './src/x.tsx' });
const ADDED = new Set(['packages/web-kit/src/ui/Card/index.ts']);
const RENAMES = [['packages/web-kit/src/x.tsx', 'packages/web-kit/src/X/X.tsx']];
const check = (head, added = ADDED) =>
  kitExportsFailure({ file: FILE, base: BASE, head, added, renames: RENAMES });

test('an entry that points at an added export-only index.ts passes', () => {
  const head = pkg({
    '.': './src/index.ts',
    './x': './src/X/X.tsx',
    './ui/Card': './src/ui/Card/index.ts',
  });
  assert.equal(check(head), null);
});

test('an entry that points at a file the move did not add fails', () => {
  const head = pkg({ '.': './src/index.ts', './x': './src/X/X.tsx', './y': './src/y/index.ts' });
  assert.match(check(head) ?? '', /"\.\/y"/);
});

test('a changed existing entry fails', () => {
  const head = pkg({ '.': './src/main.ts', './x': './src/X/X.tsx' });
  assert.match(check(head) ?? '', /"\."/);
});

test('a removed entry fails', () => {
  assert.match(check(pkg({ './x': './src/X/X.tsx' })) ?? '', /"\."/);
});

test('a change outside exports fails', () => {
  const head = pkg({ '.': './src/index.ts', './x': './src/X/X.tsx' }, { version: '2.0.0' });
  assert.match(check(head) ?? '', /outside exports/);
});
