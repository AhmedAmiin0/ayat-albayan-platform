import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withFacade } from './packages-facade.mjs';
import { makeRepo, table } from './testing/packages-fixture.test-util.mjs';
import { decide } from './packages-rules.mjs';
import { scan } from './packages-scan.mjs';

const CORE = {
  'packages/core/src/index.ts': "export * from './phone.js';\n",
  'packages/core/src/phone.ts': 'export const toE164 = (s: string) => s;\n',
};
const side = (files) => {
  const root = makeRepo({ ...CORE, ...files });
  return withFacade(root, scan(root));
};
const decided = (head, base) =>
  decide({ table: table(), baseTable: table(), head: side(head), base: side(base) });
const USE = { 'apps/api/src/a.ts': "import { toE164 } from '@ab/shared';\n" };

test('a new facade import of an owner-held name raises the count and fails', () => {
  const v = decided(USE, {});
  assert.equal(v.failed, true);
  assert.match(v.lines.join('\n'), /facade imports api: 1 > the base branch's 0/);
});

test('an unchanged count passes and is printed', () => {
  const v = decided(USE, USE);
  assert.equal(v.failed, false);
  assert.match(v.lines.join('\n'), /facade imports: 1 \{"api":1\}/);
});

test('an export-from counts; shared-own names, /testing and strings do not', () => {
  const reexport = { 'apps/staff-web/src/x.ts': "export { toE164 as e } from '@ab/shared';\n" };
  assert.deepEqual(side(reexport).counts.facade, { 'staff-web': 1 });
  const none = side({
    'apps/api/src/b.ts': "import { own } from '@ab/shared';\n",
    'apps/api/src/c.ts': "import { toE164 } from '@ab/shared/testing';\n",
    'apps/api/src/d.ts': 'export const s = "import { toE164 } from \'@ab/shared\'";\n',
  });
  assert.deepEqual(none.counts.facade, {});
});
