import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide } from './decide.ts';
import { aPriorityFacts, aRun, withPr } from './testing/facts.builder.ts';

const behind = { known: true, files: [{ filename: 'apps/api/src/a.ts' }] };
const withChecks = (checks: ReturnType<typeof aRun>[]) => ({ ...aPriorityFacts(), checks });

test('a green flagged PR level with develop merges', () => {
  assert.deepEqual(decide(aPriorityFacts()), { action: 'merge', reason: 'every condition holds' });
});

test('a flagged PR with no checks yet, a pending or a red check waits', () => {
  assert.match(decide(withChecks([])).reason, /check did not pass/);
  const pending = aRun('e2e (1)', { status: 'queued', conclusion: null });
  assert.match(decide(withChecks([aRun('check'), aRun('guards'), pending])).reason, /pending/);
  const red = aRun('verify (api)', { conclusion: 'failure' });
  assert.match(decide(withChecks([aRun('check'), aRun('guards'), red])).reason, /not green/);
});

test('a green flagged PR behind develop is updated, not merged', () => {
  const stale = { ...aPriorityFacts(), behind };
  assert.deepEqual(decide(stale), { action: 'update', reason: 'priority PR behind develop' });
  const lock = { ...stale, files: [{ filename: 'pnpm-lock.yaml' }] };
  assert.equal(decide(lock).action, 'update', 'the update also fixes a stale lockfile base');
});

test('a flagged PR is updated only once it is green and mergeable', () => {
  const red = { ...withChecks([aRun('check', { conclusion: 'failure' })]), behind };
  assert.equal(decide(red).action, 'skip');
  const facts = aPriorityFacts();
  const conflicting = { ...facts, pr: { ...facts.pr, mergeable: 'CONFLICTING' }, behind };
  assert.match(decide(conflicting).reason, /CONFLICTING/);
});

test('a non-priority PR behind develop still merges as before', () => {
  assert.equal(decide({ ...withPr({}), behind }).action, 'merge');
});
