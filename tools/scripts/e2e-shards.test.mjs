import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkGroups, costs, mergeDurations, shardMs, shardSizes } from './e2e-shards.mjs';

const groups = [
  { project: 'desktop', file: 'tests/a.spec.ts', tests: 2 },
  { project: 'desktop', file: 'tests/b.spec.ts', tests: 1 },
  { project: 'mobile', file: 'tests/a.spec.ts', tests: 2 },
];

test('groups from the reporter are checked; null (internals changed) is refused', () => {
  assert.equal(checkGroups(groups), groups);
  for (const bad of [
    null,
    [],
    [{ project: 'desktop', file: 'x', tests: 0 }],
    [{ file: 'x', tests: 1 }],
  ]) {
    assert.throws(() => checkGroups(bad), /no usable shard groups/);
  }
});

test('an unmeasured group costs the median ms per test', () => {
  assert.deepEqual(
    costs(groups, { 'tests/a.spec.ts': { desktop: 400, mobile: 100 } }),
    [400, 200, 100],
  );
  assert.deepEqual(costs(groups, {}), [2000, 1000, 2000]);
});

const g = (tests) => ({ project: 'desktop', file: 'x', tests });

test('cuts stay contiguous and minimise the slowest shard', () => {
  const groups = [g(10), g(10), g(10), g(10), g(10)];
  const ms = [500, 100, 100, 100, 100];
  assert.deepEqual(shardSizes(groups, ms, 2), [10, 40]);
  assert.deepEqual(shardMs(groups, ms, [10, 40]), [500, 400]);
});

test('equal costs give equal counts, and every test is in a shard', () => {
  const groups = Array.from({ length: 8 }, () => g(3));
  const sizes = shardSizes(
    groups,
    groups.map(() => 10),
    4,
  );
  assert.deepEqual(sizes, [6, 6, 6, 6]);
  for (const total of [1, 2, 3, 5]) {
    const s = shardSizes(groups, [5, 1, 9, 2, 2, 7, 3, 4], total);
    assert.equal(
      s.reduce((a, b) => a + b, 0),
      24,
      `total ${total}`,
    );
  }
});

test('a bad total is refused', () => {
  assert.throws(() => shardSizes([g(1)], [1], 0), /bad shard total/);
});

test('merge sums the shard outputs per file and project', () => {
  const merged = mergeDurations([
    { 'tests/b.spec.ts': { desktop: 1.4 } },
    { 'tests/a.spec.ts': { desktop: 2, mobile: 3 } },
    { 'tests/b.spec.ts': { mobile: 5 } },
  ]);
  assert.deepEqual(merged, {
    'tests/a.spec.ts': { desktop: 2, mobile: 3 },
    'tests/b.spec.ts': { desktop: 1, mobile: 5 },
  });
});
