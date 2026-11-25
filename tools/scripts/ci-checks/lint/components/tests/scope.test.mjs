import assert from 'node:assert/strict';
import { test } from 'node:test';
import { componentReports } from '../check.mjs';
import { treeOf } from '../tree.mjs';

const reports = (files) => componentReports(treeOf(new Map(Object.entries(files))));
const COMP = 'export function Fields() {\n  const [a] = useState(1);\n  return <b>{a}</b>;\n}\n';

test('a lowercase file holding a component is a component file', () => {
  const r = reports({ 'apps/staff-web/src/x/table-toolbar/fields.tsx': COMP });
  assert.ok(r.get('apps/staff-web/src/x/table-toolbar/fields.tsx::Fields')?.failures.length);
});

test('showcases, test helpers, tests, icon sets and files outside the workspaces are exempt', () => {
  for (const path of [
    'packages/web-kit/src/ui/Card/Card.showcase.tsx',
    'packages/web-kit/src/ui/Card/card.testing.tsx',
    'apps/staff-web/src/x/Card.test.tsx',
    'apps/staff-web/src/testing/Card.tsx',
    'apps/staff-mobile/src/chat/chat-icons.tsx',
    'e2e/support/Card.tsx',
  ]) {
    assert.equal(reports({ [path]: COMP }).size, 0, path);
  }
});

test('check 9: a TanStack route adapter passes; route logic fails', () => {
  const adapter = `export const Route = createFileRoute('/a')({ component: Page });
function Page() {
  const { id } = Route.useParams();
  return <StudentPage id={id} />;
}
`;
  const logic = `export const Route = createFileRoute('/a')({ component: Page });
function Page() {
  const [a] = useState(1);
  return <StudentPage a={a} />;
}
`;
  const path = 'apps/staff-web/src/routes/a.tsx';
  assert.deepEqual(reports({ [path]: adapter }).get(`${path}::Page`)?.failures, []);
  assert.deepEqual(
    reports({ [path]: logic })
      .get(`${path}::Page`)
      ?.failures.map((f) => f.check),
    [9],
  );
});

test('check 9: an expo-router file is a re-export or one element, plus ErrorBoundary', () => {
  const path = 'apps/staff-mobile/app/(tabs)/a.tsx';
  const reexport =
    "export { default } from '@/x/APage';\nexport { ErrorBoundary } from 'expo-router';\n";
  const one = 'export default function Screen() {\n  return <APage />;\n}\n';
  const hooks =
    'export default function Screen() {\n  const a = useA();\n  return <APage a={a} />;\n}\n';
  assert.equal(reports({ [path]: reexport }).size, 0);
  assert.deepEqual(reports({ [path]: one }).get(`${path}::Screen`)?.failures, []);
  assert.deepEqual(
    reports({ [path]: hooks })
      .get(`${path}::Screen`)
      ?.failures.map((f) => f.check),
    [9],
  );
});
