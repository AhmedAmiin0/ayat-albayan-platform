import assert from 'node:assert/strict';
import { test } from 'node:test';
import { componentReports } from '../check.mjs';
import { treeOf } from '../tree.mjs';
import { COMPLIANT, DIR, withFiles } from './fixtures.mjs';

const KEY = `${DIR}/RoleDialog.tsx::RoleDialog`;
const checksOf = (files, key = KEY) =>
  (componentReports(treeOf(new Map(Object.entries(files)))).get(key)?.failures ?? []).map(
    (f) => f.check,
  );

test('a compliant folder passes every check', () => {
  assert.deepEqual(checksOf(COMPLIANT), []);
});

test('check 1: a component outside its own folder, or a folder with no index.ts', () => {
  const loose = {
    'apps/staff-web/src/features/people/RoleDialog.tsx': COMPLIANT[`${DIR}/RoleDialog.tsx`],
  };
  assert.ok(
    checksOf(loose, 'apps/staff-web/src/features/people/RoleDialog.tsx::RoleDialog').includes(1),
  );
  assert.ok(checksOf(withFiles({ [`${DIR}/index.ts`]: null })).includes(1));
});

test('check 2: an index.ts with code, or one that re-exports a hook', () => {
  assert.ok(checksOf(withFiles({ [`${DIR}/index.ts`]: 'export const x = 1;\n' })).includes(2));
  const hook =
    "export { RoleDialog } from './RoleDialog';\nexport { useRoleDialog } from './use-role-dialog';\n";
  assert.ok(checksOf(withFiles({ [`${DIR}/index.ts`]: hook })).includes(2));
});

test('check 3: a second component or another top-level declaration; displayName is allowed', () => {
  const file = COMPLIANT[`${DIR}/RoleDialog.tsx`];
  assert.ok(
    checksOf(withFiles({ [`${DIR}/RoleDialog.tsx`]: `${file}\nconst LIMIT = 3;\n` })).includes(3),
  );
  const two = `${file}\nexport function Other() {\n  return <b />;\n}\n`;
  assert.ok(checksOf(withFiles({ [`${DIR}/RoleDialog.tsx`]: two })).includes(3));
  const named = `${file}\nRoleDialog.displayName = 'RoleDialog';\n`;
  assert.deepEqual(checksOf(withFiles({ [`${DIR}/RoleDialog.tsx`]: named })), []);
});

test('check 4: a type in the component file', () => {
  const file = `type Local = { a: 1 };\n${COMPLIANT[`${DIR}/RoleDialog.tsx`]}`;
  assert.ok(checksOf(withFiles({ [`${DIR}/RoleDialog.tsx`]: file })).includes(4));
});

test('check 6: a missing hook file, a hookless one, an extra export, a stray one', () => {
  assert.ok(checksOf(withFiles({ [`${DIR}/use-role-dialog.ts`]: null })).includes(6));
  const hookless = 'export function useRoleDialog() {\n  return { open: true };\n}\n';
  assert.ok(checksOf(withFiles({ [`${DIR}/use-role-dialog.ts`]: hookless })).includes(6));
  const extra = `${COMPLIANT[`${DIR}/use-role-dialog.ts`]}export const LIMIT = 3;\n`;
  assert.ok(checksOf(withFiles({ [`${DIR}/use-role-dialog.ts`]: extra })).includes(6));
  const plain = 'export function RoleDialog() {\n  return <b />;\n}\n';
  assert.ok(checksOf(withFiles({ [`${DIR}/RoleDialog.tsx`]: plain })).includes(6));
});

test('check 6: the hook file name is compared without hyphens or case', () => {
  const files = {
    'apps/family-web/src/a/WhatsAppSignIn/WhatsAppSignIn.tsx':
      'export function WhatsAppSignIn() {\n  const { a } = useWhatsAppSignIn();\n  return <b>{a}</b>;\n}\n',
    'apps/family-web/src/a/WhatsAppSignIn/use-whatsapp-sign-in.ts':
      'export function useWhatsAppSignIn() {\n  return { a: useId() };\n}\n',
    'apps/family-web/src/a/WhatsAppSignIn/index.ts':
      "export { WhatsAppSignIn } from './WhatsAppSignIn';\n",
  };
  const key = 'apps/family-web/src/a/WhatsAppSignIn/WhatsAppSignIn.tsx::WhatsAppSignIn';
  assert.deepEqual(checksOf(files, key), []);
});

test('check 8: two tests beside the component instead of tests/', () => {
  const two = withFiles({ [`${DIR}/RoleDialog.more.test.tsx`]: "test('y', () => {});\n" });
  assert.ok(checksOf(two).includes(8));
  const moved = withFiles({
    [`${DIR}/RoleDialog.test.tsx`]: null,
    [`${DIR}/tests/RoleDialog.test.tsx`]: "test('x', () => {});\n",
    [`${DIR}/tests/RoleDialog.more.test.tsx`]: "test('y', () => {});\n",
  });
  assert.deepEqual(checksOf(moved), []);
});
