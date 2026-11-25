import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aliasImports, isPackageCode } from '../alias.mjs';

const NOTE = (name) => `imports "${name}": a package never uses @/ (apps only)`;

test('isPackageCode: code files under packages/, nothing vendored or outside', () => {
  ['packages/web-kit/src/a.ts', 'packages/mobile-kit/metro.cjs', 'packages/config/vite.js']
    .concat(['packages/web-kit/src/A.tsx', 'packages/shared/src/x.mts'])
    .forEach((path) => assert.equal(isPackageCode(path), true, path));
  ['apps/api/src/a.ts', 'packages/web-kit/package.json', 'packages/x/node_modules/y/a.js']
    .concat(['packages/web-kit/src/index.css', 'tools/scripts/a.mjs'])
    .forEach((path) => assert.equal(isPackageCode(path), false, path));
});

test('every import form that names @/ fails', () => {
  const text = [
    "import a from '@/a';",
    "import type { B } from '@/b';",
    "export { c } from '@/c';",
    "export * from '@/d';",
    "import '@/e.css';",
    "const f = await import('@/f');",
    "const g = require('@/g');",
    "import h from '@/index.css?raw';",
  ].join('\n');
  const names = ['@/a', '@/b', '@/c', '@/d', '@/e.css', '@/f', '@/g', '@/index.css?raw'];
  assert.deepEqual(aliasImports(text), names.map(NOTE));
});

test('package names, relative paths and look-alikes pass', () => {
  const text = [
    "import a from '@ab/web-kit/lib/cn';",
    "import b from './b';",
    "import c from '@scope/c';",
    "import d from 'x/@/d';",
  ].join('\n');
  assert.deepEqual(aliasImports(text), []);
});

test('@/ inside a string, comment or test fixture is not an import', () => {
  const text = [
    "// apps write `import x from '@/x'`",
    'const rule = "import { a } from \'@/common/a\';";',
    "const s = '@/not-an-import';",
  ].join('\n');
  assert.deepEqual(aliasImports(text), []);
});
