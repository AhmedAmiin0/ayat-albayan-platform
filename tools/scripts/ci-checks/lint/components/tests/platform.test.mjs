import assert from 'node:assert/strict';
import { test } from 'node:test';
import { componentReports } from '../check.mjs';
import { treeOf } from '../tree.mjs';
import { COMPLIANT, DIR, withFiles } from './fixtures.mjs';

const SHARED = COMPLIANT[`${DIR}/RoleDialog.tsx`];
const checksOf = (files, file) =>
  (
    componentReports(treeOf(new Map(Object.entries(files)))).get(`${DIR}/${file}::RoleDialog`)
      ?.failures ?? []
  ).map((f) => f.check);

test('an iOS and an Android file beside the shared Name.tsx pass', () => {
  const files = withFiles({
    [`${DIR}/RoleDialog.ios.tsx`]: SHARED,
    [`${DIR}/RoleDialog.android.tsx`]: SHARED,
  });
  assert.deepEqual(checksOf(files, 'RoleDialog.ios.tsx'), []);
  assert.deepEqual(checksOf(files, 'RoleDialog.android.tsx'), []);
  assert.deepEqual(checksOf(files, 'RoleDialog.tsx'), []);
});

test('a platform file with no shared Name.tsx beside it fails check 1', () => {
  const files = withFiles({
    [`${DIR}/RoleDialog.tsx`]: null,
    [`${DIR}/RoleDialog.ios.tsx`]: SHARED,
  });
  assert.ok(checksOf(files, 'RoleDialog.ios.tsx').includes(1));
});

test('only ios and android count as platforms', () => {
  const files = withFiles({ [`${DIR}/RoleDialog.web.tsx`]: SHARED });
  assert.ok(checksOf(files, 'RoleDialog.web.tsx').includes(1));
});

test('a platform file outside its own folder fails check 1', () => {
  const loose = 'apps/staff-web/src/features/people';
  const files = {
    [`${loose}/RoleDialog.tsx`]: SHARED,
    [`${loose}/RoleDialog.ios.tsx`]: SHARED,
  };
  const reports = componentReports(treeOf(new Map(Object.entries(files))));
  const checks = reports.get(`${loose}/RoleDialog.ios.tsx::RoleDialog`)?.failures ?? [];
  assert.ok(checks.map((f) => f.check).includes(1));
});
