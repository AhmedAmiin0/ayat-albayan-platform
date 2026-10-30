import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';
import { estimateMs, MAX_SHARDS, plan } from './plan.mjs';

const durations = {
  'tests/a.spec.ts': { desktop: 200_000 },
  'tests/b.spec.ts': { desktop: 20_000 },
  'tests/c.spec.ts': { desktop: 30_000 },
};
const shards = (p) => p.matrix.include.map((m) => `${m.shard}/${m.total}`);
const FULL = [...Array.from({ length: 8 }, (_, i) => `${i + 1}/8`), 'single/8'];

test("the full suite, a bad or a missing selection: today's matrix, no spec list", () => {
  for (const sel of [
    { full: true, specs: [] },
    null,
    { full: false },
    { full: false, specs: ['../x.ts'] },
  ]) {
    const p = plan(sel, durations);
    assert.deepEqual(shards(p), FULL);
    assert.equal(p.specs, '');
  }
});

test('shards follow the measured time, never more than the spec files or 8', () => {
  assert.deepEqual(shards(plan({ full: false, specs: ['b.spec.ts'] }, durations)), [
    '1/1',
    'single/1',
  ]);
  assert.deepEqual(
    shards(plan({ full: false, specs: ['a.spec.ts', 'b.spec.ts', 'c.spec.ts'] }, durations)),
    ['1/3', '2/3', '3/3', 'single/3'],
  );
  const many = Array.from({ length: 30 }, (_, i) => `x${i}.spec.ts`);
  assert.equal(plan({ full: false, specs: many }, durations).matrix.include.length, MAX_SHARDS + 1);
  assert.equal(
    plan({ full: false, specs: ['a.spec.ts', 'b.spec.ts'] }, durations).specs,
    'tests/a.spec.ts tests/b.spec.ts',
  );
});

test('nothing selected: only the single-line smoke set runs', () => {
  assert.deepEqual(shards(plan({ full: false, specs: [] }, durations)), ['single/1']);
});

test('a spec never measured costs the median', () => {
  assert.equal(estimateMs(['new.spec.ts'], durations), 30_000);
});

test('ci.yml: the e2e fallback matrix is the full plan; only PRs select; every shard gets $SPECS', () => {
  const ci = parse(
    readFileSync(new URL('../../../../.github/workflows/ci.yml', import.meta.url), 'utf8'),
  );
  const fallback = ci.jobs.e2e.strategy.matrix.match(/\|\| '(\{.*\})'\) \}\}$/)[1];
  assert.deepEqual(JSON.parse(fallback), plan(null, {}).matrix);
  const step = ci.jobs.changes.steps.find((s) => s.id === 'e2e');
  assert.equal(
    step.if,
    "github.event_name == 'pull_request' && steps.diff.outputs.e2e == 'true' && steps.move.outputs.e2e != 'false'",
  );
  assert.match(step.run, /\|\| echo '\{"full":true/);
  const run = ci.jobs.e2e.steps.find((s) => s.name === 'e2e').run;
  assert.match(run, /--shard="\$SHARD\/\$SHARDS" \$PROJECT \$SPECS/);
  assert.ok(
    ci.jobs.guards.steps.some((s) => s.run === 'node tools/scripts/ci-checks/e2e-areas/guard.mjs'),
  );
});
