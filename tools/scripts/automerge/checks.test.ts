import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notGreen } from './checks.ts';
import { aFacts, aRun } from './testing/facts.builder.ts';

const verdict = (over: Partial<ReturnType<typeof aFacts>>) => notGreen({ ...aFacts(), ...over });
const base = aFacts().checks;

test('success, skipped and neutral runs with check and guards green are green', () => {
  assert.equal(verdict({}), null);
  assert.equal(verdict({ checks: [...base, aRun('review', { conclusion: 'neutral' })] }), null);
  assert.equal(verdict({ statuses: [{ context: 'ext', state: 'success' }] }), null);
});

test('a pending, failed or cancelled run blocks the merge', () => {
  const cases: readonly [ReturnType<typeof aRun>, RegExp][] = [
    [aRun('e2e (2)', { status: 'in_progress', conclusion: null }), /pending: e2e \(2\)/],
    [aRun('e2e (2)', { status: 'queued', conclusion: null }), /pending: e2e \(2\)/],
    [aRun('verify (web)', { conclusion: 'failure' }), /not green: verify \(web\) failure/],
    [aRun('verify (web)', { conclusion: 'cancelled' }), /not green: verify \(web\) cancelled/],
    [aRun('verify (web)', { conclusion: 'timed_out' }), /not green/],
    [aRun('verify (web)', { conclusion: 'action_required' }), /not green/],
  ];
  for (const [run, reason] of cases) assert.match(verdict({ checks: [...base, run] }) ?? '', reason);
});

test('a commit status that is not success blocks the merge', () => {
  for (const state of ['pending', 'failure', 'error'] as const) {
    const statuses = [{ context: 'ext', state }];
    assert.match(verdict({ statuses }) ?? '', /ext/, state);
  }
});

test('check and guards must both have run and passed', () => {
  const only = (runs: ReturnType<typeof aRun>[]) => verdict({ checks: runs }) ?? '';
  assert.match(only([aRun('check')]), /guards did not pass/);
  assert.match(only([aRun('guards')]), /check did not pass/);
  assert.match(only([aRun('check'), aRun('guards', { conclusion: 'skipped' })]), /guards did not/);
  assert.match(only([]), /check did not pass/);
});

test('the automerge job itself is ignored while it runs', () => {
  const self = aRun('lane automerge', { status: 'in_progress', conclusion: null });
  assert.equal(verdict({ checks: [...base, self] }), null);
});

test('a cancelled run is superseded by a later success of the same check on the head', () => {
  const twice = [aRun('pr title', { conclusion: 'cancelled' }), aRun('pr title')];
  assert.equal(verdict({ checks: [...base, ...twice] }), null);
  const alone = [aRun('pr title', { conclusion: 'cancelled' })];
  assert.match(verdict({ checks: [...base, ...alone] }) ?? '', /not green: pr title cancelled/);
  const failedToo = [aRun('pr title', { conclusion: 'failure' }), aRun('pr title')];
  assert.match(verdict({ checks: [...base, ...failedToo] }) ?? '', /pr title failure/);
});

test('a failed run is superseded only by a newer success of the same check', () => {
  const fixed = [aRun('pr title', { id: 1, conclusion: 'failure' }), aRun('pr title', { id: 2 })];
  assert.equal(verdict({ checks: [...base, ...fixed] }), null);
  const broken = [aRun('pr title', { id: 2, conclusion: 'failure' }), aRun('pr title', { id: 1 })];
  assert.match(verdict({ checks: [...base, ...broken] }) ?? '', /not green: pr title failure/);
  const other = [aRun('pr title', { id: 1, conclusion: 'failure' }), aRun('guards', { id: 2 })];
  assert.match(verdict({ checks: [...base, ...other] }) ?? '', /not green: pr title failure/);
  const timedOut = [aRun('e2e (2)', { id: 1, conclusion: 'timed_out' }), aRun('e2e (2)', { id: 2 })];
  assert.equal(verdict({ checks: [...base, ...timedOut] }), null);
});

test('a run still in progress is never superseded', () => {
  const stuck = aRun('e2e (2)', { id: 1, status: 'in_progress', conclusion: null });
  assert.match(verdict({ checks: [...base, stuck, aRun('e2e (2)', { id: 2 })] }) ?? '', /pending/);
});
