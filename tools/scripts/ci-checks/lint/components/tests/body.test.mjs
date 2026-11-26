import assert from 'node:assert/strict';
import { test } from 'node:test';
import { componentReports } from '../check.mjs';
import { treeOf } from '../tree.mjs';
import { DIR, withFiles, withJsx } from './fixtures.mjs';

const KEY = `${DIR}/RoleDialog.tsx::RoleDialog`;
const failuresOf = (files) =>
  (componentReports(treeOf(new Map(Object.entries(files)))).get(KEY)?.failures ?? []).filter(
    (f) => f.check === 5,
  );
const jsx = (text) => failuresOf(withFiles(withJsx(text)));
const body = (text) =>
  failuresOf(
    withFiles({
      [`${DIR}/RoleDialog.tsx`]: `export function RoleDialog(props: RoleDialogProps) {\n${text}\n}\n`,
      [`${DIR}/use-role-dialog.ts`]: null,
    }),
  );

test('passing arrows: render prop, renderItem, .map, void call, accessor, object argument', () => {
  for (const text of [
    '<Query render={(d) => <Row d={d} />} />',
    '<List renderItem={({ item }) => { return <Row item={item} />; }} />',
    '<ul>{rows.map((r) => (r.ok ? <A key={r.id} /> : null))}</ul>',
    '<B onClick={() => void save(1)} />',
    '<B getKey={(c) => c.id} />',
    '<B onClick={() => save({ id: 1, ...rows })} />',
  ]) {
    assert.deepEqual(jsx(text), [], text);
  }
});

test('failing arrows: two calls, a ternary handler, a logical handler, a block handler', () => {
  for (const text of [
    '<B onClick={() => { save(1); pick(2); }} />',
    '<B onClick={() => (open ? save(1) : pick(1))} />',
    '<B onClick={() => open && save(1)} />',
    '<B onClick={() => save(() => 1)} />',
  ]) {
    assert.equal(jsx(text).length > 0, true, text);
  }
});

test('array derivations in JSX fail; .map does not', () => {
  assert.ok(jsx('<ul>{rows.filter((r) => r.ok).map((r) => <A key={r.id} />)}</ul>').length > 0);
  assert.ok(jsx('<b>{rows.some((r) => r.ok)}</b>').length > 0);
});

test('a hook called in JSX, a second statement beside the own hook, a JSX const', () => {
  assert.ok(jsx('<B can={usePermissions()} />').length > 0);
  const extra = '  const { a } = useRoleDialog(props);\n  const b = a + 1;\n  return <B b={b} />;';
  assert.ok(body(extra).length > 0);
  assert.ok(body('  const el = <b />;\n  return el;').length > 0);
});

test('without its own hook: useTheme and value consts pass; a function literal or hook fails', () => {
  assert.deepEqual(
    body(
      '  const { colors } = useTheme();\n  const n = props.id.length;\n  return <B n={n} c={colors} />;',
    ),
    [],
  );
  assert.ok(body('  const f = () => 1;\n  return <B f={f} />;').length > 0);
  assert.ok(body('  const [a] = useState(1);\n  return <B a={a} />;').length > 0);
});

test('guards: a plain guard passes, an else or a statement after a guard fails', () => {
  assert.deepEqual(body('  if (!props.id) return null;\n  return <b />;'), []);
  assert.ok(
    body('  if (!props.id) return null;\n  else return <i />;\n  return <b />;').length > 0,
  );
  assert.ok(
    body('  if (!props.id) return null;\n  const n = 1;\n  return <b n={n} />;').length > 0,
  );
});

test('a component wrapped in forwardRef or memo fails', () => {
  const files = withFiles({
    [`${DIR}/RoleDialog.tsx`]:
      'export const RoleDialog = memo(function RoleDialog() {\n  return <b />;\n});\n',
    [`${DIR}/use-role-dialog.ts`]: null,
  });
  assert.ok(failuresOf(files).length > 0);
});

test('a bare call to its own hook passes; any other bare call fails', () => {
  assert.deepEqual(body('  useRoleDialog(props);\n  return <b />;'), []);
  assert.ok(body('  track(props);\n  return <b />;').length > 0);
});
