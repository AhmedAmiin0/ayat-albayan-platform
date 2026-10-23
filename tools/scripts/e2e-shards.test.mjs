import assert from 'node:assert/strict';
import { test } from 'node:test';
import { costs, groupsFromList, mergeDurations, shardMs, shardSizes } from './e2e-shards.mjs';

const spec = (projects) => ({ tests: projects.map((projectName) => ({ projectName })) });
const list = {
  config: { projects: [{ name: 'setup' }, { name: 'desktop' }, { name: 'mobile' }] },
  suites: [
    { file: 'auth.setup.ts', specs: [spec(['setup', 'setup'])] },
    {
      file: 'a.spec.ts',
      specs: [spec(['desktop', 'mobile'])],
      suites: [{ specs: [spec(['desktop', 'mobile'])] }],
    },
    { file: 'b.spec.ts', specs: [spec(['desktop'])] },
  ],
};

test('groups follow Playwright: projects in config order, files as listed, setup left out', () => {
  assert.deepEqual(groupsFromList(list), [
    { project: 'desktop', file: 'tests/a.spec.ts', tests: 2 },
    { project: 'desktop', file: 'tests/b.spec.ts', tests: 1 },
    { project: 'mobile', file: 'tests/a.spec.ts', tests: 2 },
  ]);
});

test('an unmeasured group costs the median ms per test', () => {
  const groups = groupsFromList(list);
  assert.deepEqual(costs(groups, { 'tests/a.spec.ts': { desktop: 400, mobile: 100 } }), [
    400,
    200,
    100,
  ]);
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
