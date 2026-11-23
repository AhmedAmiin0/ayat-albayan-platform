import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { aliasOf, absoluteSpec } from './absolute-resolve.mjs';

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'abs-resolve-'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}

const WEB = { 'apps/web/package.json': '{ "imports": { "#/*": "./src/*" } }' };
const API_IMPORTS = { '#/*.ts': { types: './src/*.ts', default: './dist/*.js' } };

test('aliasOf: `#/` from package.json `imports`, plain or by condition; none without it', () => {
  const root = fixture({
    ...WEB,
    'apps/api/package.json': JSON.stringify({ imports: API_IMPORTS }),
    'apps/old/package.json': '{ "name": "old" }',
    'apps/old/tsconfig.json': '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
  });
  assert.deepEqual(aliasOf(root, 'apps/web'), { root, scope: 'apps/web', dir: 'apps/web/src' });
  assert.deepEqual(aliasOf(root, 'apps/api'), { root, scope: 'apps/api', dir: 'apps/api/src' });
  assert.equal(aliasOf(root, 'apps/old'), undefined, 'tsconfig paths are not an alias any more');
  assert.equal(aliasOf(root, 'apps/none'), undefined);
});

test('absoluteSpec: `../`, `@/` and a bare `#/` name the file with its extension', () => {
  const root = fixture({
    ...WEB,
    'apps/web/src/lib/api.ts': '',
    'apps/web/src/ui/Button.tsx': '',
    'apps/web/src/inbox/index.ts': '',
    'apps/web/src/shell/index.tsx': '',
    'apps/web/src/index.css': '',
  });
  const alias = aliasOf(root, 'apps/web');
  const file = 'apps/web/src/features/a/b.ts';
  const spec = (s) => absoluteSpec(alias, file, s);
  assert.equal(spec('../../lib/api'), '#/lib/api.ts');
  assert.equal(spec('@/ui/Button'), '#/ui/Button.tsx');
  assert.equal(spec('#/inbox'), '#/inbox/index.ts');
  assert.equal(spec('@/shell'), '#/shell/index.tsx');
  assert.equal(spec('../../lib/api.js'), '#/lib/api.ts', 'a NodeNext `.js` names its `.ts`');
  assert.equal(spec('@/index.css?raw'), '#/index.css?raw', 'an asset keeps its name and query');
});

test('absoluteSpec: null when nothing changes or nothing resolves', () => {
  const root = fixture({ ...WEB, 'apps/web/src/lib/api.ts': '', 'apps/web/app.json': '' });
  const alias = aliasOf(root, 'apps/web');
  const file = 'apps/web/src/features/b.ts';
  const spec = (s) => absoluteSpec(alias, file, s);
  assert.equal(spec('#/lib/api.ts'), null, 'already exact');
  assert.equal(spec('./x'), null, 'a sibling stays');
  assert.equal(spec('react'), null);
  assert.equal(spec('../../app.json'), null, 'outside src/');
  assert.equal(spec('@/lib/missing'), null, 'no such file');
});
