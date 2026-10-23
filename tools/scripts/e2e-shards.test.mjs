import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ambiguousPaths, mergeDurations, planShards, specFiles } from './e2e-shards.mjs';

const files = [
  'tests/a.spec.ts',
  'tests/b.spec.ts',
  'tests/c.spec.ts',
  'tests/d.spec.ts',
  'tests/e.spec.ts',
];
const durations = {
  'tests/a.spec.ts': { desktop: 600, mobile: 600 },
  'tests/b.spec.ts': { desktop: 300 },
  'tests/c.spec.ts': { desktop: 200, mobile: 900 },
  'tests/d.spec.ts': { desktop: 100 },
};
const plan = (total, projects = ['desktop']) => planShards({ files, durations, total, projects });

test('every spec runs in exactly one shard', () => {
  for (const total of [1, 2, 3, 4, 7]) {
    const all = plan(total)
      .flatMap((s) => s.files)
      .sort();
    assert.deepEqual(all, files, `total ${total}`);
  }
});

test('slowest first, each file to the lightest shard (e costs the median, 300)', () => {
  const [one, two] = plan(2);
  assert.deepEqual([one.files, one.ms], [['tests/a.spec.ts', 'tests/c.spec.ts'], 800]);
  assert.deepEqual(
    [two.files, two.ms],
    [['tests/b.spec.ts', 'tests/d.spec.ts', 'tests/e.spec.ts'], 700],
  );
});

test('a push counts the mobile project too, so the split changes', () => {
  const [one, two] = plan(2, ['desktop', 'mobile']);
  assert.deepEqual(
    [one.files, one.ms],
    [['tests/a.spec.ts', 'tests/b.spec.ts', 'tests/d.spec.ts'], 1600],
  );
  assert.deepEqual([two.files, two.ms], [['tests/c.spec.ts', 'tests/e.spec.ts'], 2200]);
});

test('a spec without a measurement costs the median, and the plan is deterministic', () => {
  const s = plan(3);
  assert.equal(
    s.reduce((n, x) => n + x.ms, 0),
    600 + 300 + 200 + 100 + 300,
  );
  assert.deepEqual(plan(3), s);
});

test('an empty durations file still splits by count', () => {
  const s = planShards({ files, durations: {}, total: 2, projects: ['desktop'] });
  assert.deepEqual(
    s.map((x) => x.files.length),
    [3, 2],
  );
});

test('a bad total is refused', () => {
  assert.throws(() => plan(0), /bad shard total/);
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

test('a path that would also select another spec is reported', () => {
  assert.deepEqual(ambiguousPaths(['tests/a.spec.ts', 'tests/xa.spec.ts']), []);
  assert.deepEqual(ambiguousPaths(['tests/chat.spec.ts', 'tests/chat.spec.ts.bak']), [
    'tests/chat.spec.ts also matches tests/chat.spec.ts.bak',
  ]);
});

test('the real spec list has no ambiguous path', () => {
  const real = specFiles();
  assert.ok(real.length > 50);
  assert.deepEqual(ambiguousPaths(real), []);
});
