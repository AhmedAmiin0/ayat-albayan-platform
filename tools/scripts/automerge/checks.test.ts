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
  const twice = [aRun('secret-scan', { conclusion: 'cancelled' }), aRun('secret-scan')];
  assert.equal(verdict({ checks: [...base, ...twice] }), null);
  const alone = [aRun('secret-scan', { conclusion: 'cancelled' })];
  assert.match(verdict({ checks: [...base, ...alone] }) ?? '', /not green: secret-scan cancelled/);
  const failedToo = [aRun('secret-scan', { conclusion: 'failure' }), aRun('secret-scan')];
  assert.match(verdict({ checks: [...base, ...failedToo] }) ?? '', /secret-scan failure/);
});

test('a failed check stays red when another workflow has a passing job of the same name', () => {
  const twice = [aRun('check', { conclusion: 'failure' }), aRun('check')];
  assert.match(verdict({ checks: [aRun('guards'), ...twice] }) ?? '', /not green: check failure/);
});

test('the title check is left to the live title rule, whatever its runs say', () => {
  const failed = aRun('pr title', { conclusion: 'failure' });
  const edited = [aRun('pr title', { conclusion: 'cancelled' }), failed, aRun('pr title')];
  assert.equal(verdict({ checks: [...base, ...edited] }), null);
  assert.equal(verdict({ checks: [...base, failed] }), null);
  const running = aRun('pr title', { status: 'in_progress', conclusion: null });
  assert.equal(verdict({ checks: [...base, running] }), null);
});
