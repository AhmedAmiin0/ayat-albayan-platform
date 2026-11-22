import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRepo, table } from './packages-fixture.test-util.mjs';
import { decide } from './packages-rules.mjs';
import { scan } from './packages-scan.mjs';
import { validateTable } from './packages-table.mjs';

const side = (files) => scan(makeRepo(files));
const decided = (head, base, baseTable = table()) =>
  decide({ table: table(), baseTable, head: side(head), base: side(base) });

test('web-kit → mobile-kit in allowed fails validation; schedule → time is allowed', () => {
  const t = table();
  assert.deepEqual(validateTable(t), []);
  t.allowed['@ab/web-kit'] = ['@ab/mobile-kit'];
  t.pathReach.e2e = ['@ab/nope'];
  assert.deepEqual(validateTable(t), [
    'allowed @ab/web-kit → @ab/mobile-kit: not in a lower layer',
    'pathReach e2e → @ab/nope: not in a lower layer',
  ]);
  const ok = decided({ 'packages/schedule/src/a.ts': "import '@ab/time';" }, {});
  assert.deepEqual([ok.failed, ok.lines.filter((l) => l.includes('extra'))], [false, []]);
});

test("a new `export * from '@ab/core'` raises the re-export count and fails", () => {
  const v = decided({ 'packages/time/src/index.ts': "export * from '@ab/core';" }, {});
  assert.equal(v.failed, true);
  assert.match(v.lines.join('\n'), /re-exports @ab\/time: 1 > the base branch's 0/);
});

test("'@ab/db' in an api service raises the db scope and fails; in a repo it passes", () => {
  const service = decided({ 'apps/api/src/foo.service.ts': "import { Db } from '@ab/db';" }, {});
  assert.match(service.lines.join('\n'), /db scope api: 1 > the base branch's 0/);
  assert.equal(service.failed, true);
  const repo = decided({ 'apps/api/src/foo.repo.ts': "import { Db } from '@ab/db';" }, {});
  assert.equal(repo.failed, false);
});

test('an extra the base already has passes and is printed; a new one fails', () => {
  const extra = { 'packages/time/src/a.ts': "import '@ab/schedule';" };
  const kept = decided(extra, extra);
  assert.equal(kept.failed, false);
  assert.match(kept.lines.join('\n'), /extra @ab\/time → @ab\/schedule \(import\)/);
  const added = decided(extra, {});
  assert.equal(added.failed, true);
  assert.match(added.lines.join('\n'), /new extra @ab\/time → @ab\/schedule \(import\)/);
});

test('widening allowed prints the owner-go warning and passes; no base table is not widened', () => {
  const base = table();
  base.allowed['@ab/schedule'] = ['@ab/core'];
  const v = decided({}, {}, base);
  assert.equal(v.failed, false);
  assert.match(
    v.warnings.join('\n'),
    /layer table widened: merge only with the repository owner's go/,
  );
  const none = decide({ table: table(), head: side({}), base: side({}) });
  assert.deepEqual(none.warnings, []);
});

test('on develop (no base) extras print with up to 3 files and fatal edges still fail', () => {
  const files = Object.fromEntries(
    [1, 2, 3, 4].map((n) => [`packages/time/src/a${n}.ts`, "import '@ab/schedule';"]),
  );
  const head = side({ ...files, 'apps/staff-web/src/a.ts': "import 'family-web/x';" });
  const v = decide({ table: table(), head });
  assert.equal(v.failed, true);
  assert.match(
    v.lines.join('\n'),
    /a1\.ts, packages\/time\/src\/a2\.ts, packages\/time\/src\/a3\.ts …/,
  );
});
