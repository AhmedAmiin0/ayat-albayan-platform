import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planAll } from '../plan.ts';
import type { PlanContext } from '../runners.ts';

const PATH = 'apps/family-web/src/x/Card/Card.tsx';
const TARGET = { path: PATH, name: 'Card', ws: 'apps/family-web' };

const ctx = (text: string, over: Partial<PlanContext> = {}): PlanContext => ({
  read: (p) => (p === PATH ? text : ''),
  tested: () => true,
  importers: () => [],
  names: () => ['Card.tsx', 'index.ts'],
  excludes: new Map(),
  ...over,
});

const HOOKED =
  'export function Card(props: { a: number }) {\n  const [n] = useState(props.a);\n  return <b>{n}</b>;\n}\n';

test('the steps run in order on one overlay and every file they make is kept', () => {
  const { rows, files } = planAll([TARGET], ['types', 'helpers', 'hook'], ctx(HOOKED));
  assert.deepEqual(
    rows.map((r) => `${r.step}:${r.result}`),
    ['types:typed', 'helpers:unchanged', 'hook:hooked'],
  );
  assert.deepEqual([...files.keys()].toSorted(), [
    PATH,
    'apps/family-web/src/x/Card/Card.types.ts',
    'apps/family-web/src/x/Card/use-card.ts',
  ]);
});

test('a refusal at any step leaves the component whole; an excluded one is not planned', () => {
  const untested = planAll([TARGET], ['types', 'hook'], ctx(HOOKED, { tested: () => false }));
  assert.deepEqual(
    untested.rows.map((r) => r.result),
    ['typed', 'refused'],
  );
  assert.equal(untested.files.size, 0);
  const excluded = planAll(
    [TARGET],
    ['types'],
    ctx(HOOKED, { excludes: new Map([['apps/family-web/src/x', 'open PR #9']]) }),
  );
  assert.deepEqual(
    excluded.rows.map((r) => r.reason),
    ['excluded: open PR #9'],
  );
});
