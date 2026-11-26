import assert from 'node:assert/strict';
import { test } from 'node:test';
import { componentReports } from '../check.mjs';
import { treeOf } from '../tree.mjs';
import { COMPLIANT, DIR, withFiles } from './fixtures.mjs';

const KEY = `${DIR}/RoleDialog.tsx::RoleDialog`;
const checksOf = (files) =>
  (componentReports(treeOf(new Map(Object.entries(files)))).get(KEY)?.failures ?? []).map(
    (f) => f.check,
  );

test('check 7: a local hook imported from outside its folder fails, by ./, ../ or @/', () => {
  for (const spec of [
    './RoleDialog/use-role-dialog',
    '@/features/people/RoleDialog/use-role-dialog',
  ]) {
    const files = withFiles({
      'apps/staff-web/src/features/people/other.ts': `import { useRoleDialog } from '${spec}';\n`,
    });
    assert.ok(checksOf(files).includes(7), spec);
  }
});

test('check 7: imports from inside the folder, tests included, pass', () => {
  const files = withFiles({
    [`${DIR}/RoleDialog.test.tsx`]: null,
    [`${DIR}/tests/use-role-dialog.test.ts`]:
      "import { useRoleDialog } from '../use-role-dialog';\n",
  });
  assert.deepEqual(checksOf(files), []);
});

test('check 7: a kit local hook reached through the kit exports map fails', () => {
  const kit = 'packages/web-kit/src/ui/Card';
  const files = {
    'packages/web-kit/package.json': JSON.stringify({ exports: { './*': { default: './src/*' } } }),
    [`${kit}/Card.tsx`]:
      'export function Card() {\n  const { a } = useCard();\n  return <b>{a}</b>;\n}\n',
    [`${kit}/use-card.ts`]: 'export function useCard() {\n  return { a: useId() };\n}\n',
    [`${kit}/index.ts`]: "export { Card } from './Card';\n",
    'apps/staff-web/src/x.ts': "import { useCard } from '@ab/web-kit/ui/Card/use-card';\n",
  };
  const reports = componentReports(treeOf(new Map(Object.entries(files))));
  assert.deepEqual(
    reports.get(`${kit}/Card.tsx::Card`)?.failures.map((f) => f.check),
    [7],
  );
  assert.equal(COMPLIANT[`${DIR}/index.ts`].includes('use'), false);
});
