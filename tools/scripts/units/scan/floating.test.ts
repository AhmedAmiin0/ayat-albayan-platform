import assert from 'node:assert/strict';
import { test } from 'node:test';
import { floatingIn } from './floating.ts';

const PANE = 'apps/web/src/pane';

test('a unit of 3+ files outside a folder named after it floats (fold)', () => {
  const names = ['ThreadPane.tsx', 'ThreadPane.a.test.tsx', 'ThreadPane.b.test.tsx', 'Pair.ts'];
  const [unit, ...rest] = floatingIn(PANE, [...names, 'Pair.test.ts']);
  assert.equal(rest.length, 0, 'a code + test pair stays');
  assert.deepEqual(unit, {
    dir: PANE,
    name: 'ThreadPane',
    files: ['ThreadPane.a.test.tsx', 'ThreadPane.b.test.tsx', 'ThreadPane.tsx'],
    tests: ['ThreadPane.a.test.tsx', 'ThreadPane.b.test.tsx'],
    action: 'fold',
  });
});

test('in its own folder a unit floats only while 2+ of its tests sit beside it (tests)', () => {
  const two = floatingIn('pkg/src/usage', ['usage.ts', 'usage.test.ts', 'usage.stop.test.ts']);
  assert.deepEqual(
    two.map((u) => [u.name, u.action]),
    [['usage', 'tests']],
  );
  assert.deepEqual(
    floatingIn('pkg/src/usage', ['usage.ts', 'usage.test.ts', 'usage.types.ts']),
    [],
  );
});

test('3 code files without tests float too; 2 files never do', () => {
  const names = ['Card.tsx', 'Card.props.ts', 'Card.styles.ts', 'Other.tsx', 'Other.types.ts'];
  assert.deepEqual(
    floatingIn('x', names).map((u) => u.name),
    ['Card'],
  );
});
