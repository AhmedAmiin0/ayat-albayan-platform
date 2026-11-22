import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalize } from '../pure-move-check.mjs';
import { classifyDeps } from './deps.mjs';
import { headModules } from './exports.mjs';

const PKG = `{
  "name": "@ab/scripts",
  "dependencies": {
    "@ab/shared": "workspace:*",
    "zod": "^4.6.5"
  }
}
`;
const LOCK = `lockfileVersion: '9.0'

importers:

  apps/api:
    dependencies:
      '@ab/shared':
        specifier: workspace:*
        version: link:../../packages/shared
      zod:
        specifier: ^4.6.5
        version: 4.6.5

packages:

  zod@4.6.5:
    resolution: {integrity: sha512-x}
`;
const TIME = `      '@ab/time':
        specifier: workspace:*
        version: link:../../packages/time
`;
const kind = (to, [base, head], opts = {}) => {
  const files = { ...opts.tree };
  const grep = (re) => Object.keys(files).filter((f) => new RegExp(re).test(files[f] ?? ''));
  const modules = headModules({ read: (f) => files[f] ?? '', grep }, normalize);
  const read = (side) => (side === 'base' ? base : head);
  return classifyDeps({ status: opts.status ?? 'M', from: to, to }, read, { modules })?.kind ?? 'none';
};

test('package.json: a workspace dependency line added or removed is config', () => {
  const added = PKG.replace('"zod"', '"@ab/time": "workspace:*",\n    "zod"');
  assert.equal(kind('tools/scripts/package.json', [PKG, added]), 'config');
  assert.equal(kind('tools/scripts/package.json', [added, PKG]), 'config');
  const last = PKG.replace('"^4.6.5"', '"^4.6.5",\n    "@ab/time": "workspace:*"');
  assert.equal(kind('tools/scripts/package.json', [PKG, last]), 'config', 'the comma it needs');
});

test('package.json: a version change or any other line is bad', () => {
  assert.equal(kind('package.json', [PKG, PKG.replace('^4.6.5', '^4.7.0')]), 'bad');
  assert.equal(kind('package.json', [PKG, PKG.replace('"@ab/shared": "workspace:*"', '"@ab/shared": "workspace:^"')]), 'bad');
  const external = PKG.replace('"zod"', '"left-pad": "workspace:*",\n    "zod"');
  assert.equal(kind('package.json', [PKG, external]), 'bad');
  assert.equal(kind('package.json', [PKG, PKG.replace('"@ab/scripts"', '"@ab/tools"')]), 'bad');
});

test('pnpm-lock.yaml: importer link entries added or removed are config', () => {
  const added = LOCK.replace("      zod:\n", `${TIME}      zod:\n`);
  assert.equal(kind('pnpm-lock.yaml', [LOCK, added]), 'config');
  assert.equal(kind('pnpm-lock.yaml', [added, LOCK]), 'config');
});

test('pnpm-lock.yaml: any other hunk is bad', () => {
  const wrongLink = TIME.replace('packages/time', 'packages/money');
  assert.equal(kind('pnpm-lock.yaml', [LOCK, LOCK.replace("      zod:\n", `${wrongLink}      zod:\n`)]), 'bad');
  assert.equal(kind('pnpm-lock.yaml', [LOCK, LOCK.replace('version: 4.6.5', 'version: 4.7.0')]), 'bad');
  assert.equal(kind('pnpm-lock.yaml', [LOCK, LOCK.replace('sha512-x', 'sha512-y')]), 'bad');
  const outside = `${LOCK}\n  '@ab/time':\n    specifier: workspace:*\n    version: link:../../packages/time\n`;
  assert.equal(kind('pnpm-lock.yaml', [LOCK, outside]), 'bad', 'not under importers:');
});

test('a deleted file made only of workspace re-exports nobody imports from it', () => {
  const file = 'apps/staff-web/src/lib/time.ts';
  const text = "export { formatDay } from '@ab/time';\nexport * from '@ab/i18n';\n";
  const tree = {
    'packages/i18n/src/index.ts': 'export const t = 1;\n',
    'apps/staff-web/src/y/b.ts': "import { formatDay } from '@ab/time';\n",
  };
  assert.equal(kind(file, [text, ''], { status: 'D', tree }), 'barrel');
  const used = { ...tree, 'apps/staff-web/src/y/c.ts': "import { t } from '@/lib/time';\n" };
  assert.equal(kind(file, [text, ''], { status: 'D', tree: used }), 'bad');
  assert.equal(kind(file, [`${text}export const x = 1;\n`, ''], { status: 'D', tree }), 'none');
  assert.equal(kind(file, ["export { a } from './a';\n", ''], { status: 'D', tree }), 'none');
});

test('other files are left to the other rules', () => {
  assert.equal(kind('apps/api/src/a.ts', ['a', 'b']), 'none');
  assert.equal(kind('docs/package.json.md', ['a', 'b']), 'none');
});
