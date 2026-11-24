import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { test } from 'node:test';
import { unshim } from './shims.ts';
import { app, repo } from './fixture.test-util.ts';

const API = app('api', { '@ab/shared': 'workspace:*' });
const SHIM = 'apps/api/src/conf/recipients.ts';
const read = (root: string, path: string): string => readFileSync(posix.join(root, path), 'utf8');

const tree = (extra: Record<string, string>): string =>
  repo({
    ...API,
    [SHIM]:
      "export { toE164 as phone, own } from '@ab/shared';\nexport type { Zone } from '@ab/time';\n",
    'apps/api/src/a.ts': "import { phone } from './conf/recipients';\nphone('1');\n",
    'apps/api/src/b.test.ts': "import { own, type Zone } from '@/conf/recipients.js';\n",
    ...extra,
  });

test('--shims repoints the importers of an app re-export file and deletes it once dead', () => {
  const root = tree({});
  const r = unshim({ root, workspace: 'apps/api', write: true });
  assert.deepEqual([r.shims, r.deleted], [[SHIM], [SHIM]]);
  assert.deepEqual(r.repointed, ['apps/api/src/a.ts', 'apps/api/src/b.test.ts']);
  assert.equal(
    read(root, 'apps/api/src/a.ts'),
    "import { toE164 as phone } from '@ab/core';\nphone('1');\n",
  );
  assert.equal(
    read(root, 'apps/api/src/b.test.ts'),
    "import { own } from '@ab/shared';\nimport type { Zone } from '@ab/time';\n",
  );
  assert.equal(existsSync(posix.join(root, SHIM)), false);
  assert.deepEqual(Object.keys(JSON.parse(read(root, 'apps/api/package.json')).dependencies), [
    '@ab/core',
    '@ab/shared',
    '@ab/time',
  ]);
});

test('a re-export still reached through a barrel stays; the rest of its file is kept', () => {
  const keep = "export { t } from '@ab/shared';\nexport const k = 1;\n";
  const root = tree({
    'apps/api/src/conf/keep.ts': keep,
    'apps/api/src/conf/index.ts': "export * from './keep';\n",
    'apps/api/src/c.ts': "import { k, t } from '@/conf/keep';\n",
  });
  const r = unshim({ root, workspace: 'apps/api', write: true });
  assert.deepEqual(r.kept, ['apps/api/src/conf/keep.ts']);
  assert.equal(
    read(root, 'apps/api/src/c.ts'),
    "import { k } from '@/conf/keep';\nimport { t } from '@ab/i18n';\n",
  );
  assert.equal(read(root, 'apps/api/src/conf/keep.ts'), keep);
});

test('a dead re-export statement goes and the file keeps its own code', () => {
  const root = tree({ [SHIM]: "export { own } from '@ab/shared';\nexport const x = 1;\n" });
  unshim({ root, workspace: 'apps/api', write: true });
  assert.equal(read(root, SHIM), 'export const x = 1;\n');
});

test('a mocked re-export file is manual and nothing changes', () => {
  const mock = "vi.mock('./conf/recipients', () => ({}));\n";
  const root = tree({ 'apps/api/src/m.test.ts': mock });
  const r = unshim({ root, workspace: 'apps/api', write: true });
  assert.deepEqual([r.manual, r.repointed], [[SHIM], []]);
  assert.match(read(root, 'apps/api/src/a.ts'), /from '.\/conf\/recipients'/);
});

test('--dry-run reports and writes nothing', () => {
  const root = tree({});
  const r = unshim({ root, workspace: 'apps/api', write: false });
  assert.deepEqual(r.deleted, [SHIM]);
  assert.equal(existsSync(posix.join(root, SHIM)), true);
});

test("a repointed name joins the importer's own import of its owner", () => {
  const a = "import { t } from '@ab/core';\nimport { phone } from './conf/recipients';\n";
  const root = tree({ 'apps/api/src/a.ts': a });
  unshim({ root, workspace: 'apps/api', write: true });
  assert.equal(read(root, 'apps/api/src/a.ts'), "import { t, toE164 as phone } from '@ab/core';\n");
});

test('an importer the repoint would push past 150 lines is over cap and keeps its re-export', () => {
  const big = `import { own, phone } from './conf/recipients';\n${'f();\n'.repeat(149)}`;
  const root = tree({ 'apps/api/src/a.ts': big });
  const r = unshim({ root, workspace: 'apps/api', write: true });
  assert.deepEqual(
    [r.overCap, r.repointed, r.deleted],
    [['apps/api/src/a.ts'], ['apps/api/src/b.test.ts'], []],
  );
  assert.equal(read(root, 'apps/api/src/a.ts'), big);
  assert.equal(existsSync(posix.join(root, SHIM)), true);
});

test('a re-export file that also imports another one keeps its repointed import', () => {
  const fixtures = 'apps/api/src/fixtures.ts';
  const text = "export { own } from '@ab/shared';\nimport { phone } from './conf/recipients';\n";
  const root = tree({ [fixtures]: `${text}export const f = phone;\n` });
  const r = unshim({ root, workspace: 'apps/api', write: true });
  assert.ok(r.repointed.includes(fixtures));
  assert.equal(
    read(root, fixtures),
    "import { toE164 as phone } from '@ab/core';\nexport const f = phone;\n",
  );
});
