import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aPull, aRun, aYieldFacts, SELF } from '../testing/yield.builder.ts';
import { verdict } from '../yield/index.ts';

const fixPull = aPull({ number: 5, head: 'fix/a', labels: ['priority'] });
const fixRun = aRun({ id: 300, head_branch: 'fix/a' });
const own = aYieldFacts();

test('nothing priority queued or running: go', () => {
  assert.deepEqual(verdict(own, SELF), { wait: false, reason: 'no priority run ahead' });
  const other = { runs: [...own.runs, aRun()], pulls: [...own.pulls, aPull()] };
  assert.equal(verdict(other, SELF).wait, false, 'a non-priority run never blocks');
});

test('a priority PR run, by its PR or dispatched on its branch, makes this run wait', () => {
  const facts = { runs: [...own.runs, fixRun], pulls: [...own.pulls, fixPull] };
  assert.deepEqual(verdict(facts, SELF), { wait: true, reason: 'waiting for #5 (fix/a)' });
  const dispatched = { ...facts, runs: [...own.runs, { ...fixRun, event: 'workflow_dispatch' }] };
  assert.equal(verdict(dispatched, SELF).wait, true);
});

test('a ci run of develop, pushed or dispatched after a merge, makes this run wait', () => {
  for (const event of ['push', 'workflow_dispatch']) {
    const runs = [...own.runs, aRun({ event, head_branch: 'develop' })];
    assert.deepEqual(verdict({ ...own, runs }, SELF), {
      wait: true,
      reason: 'waiting for develop',
    });
  }
});

test('a branch named like a priority PR from a fork never blocks', () => {
  const forkRun = { ...fixRun, head_repository: 'fork/r' };
  const facts = { runs: [...own.runs, forkRun], pulls: [...own.pulls, fixPull] };
  assert.equal(verdict(facts, SELF).wait, false);
  const forkPull = { ...fixPull, repo: 'fork/r' };
  assert.equal(verdict({ runs: [...own.runs, fixRun], pulls: [forkPull] }, SELF).wait, false);
});

test('a label removed from the other PR stops the wait; added to this PR, it goes', () => {
  const unflagged = { runs: [...own.runs, fixRun], pulls: [{ ...fixPull, labels: [] }] };
  assert.equal(verdict(unflagged, SELF).wait, false);
  const pulls = [aPull({ number: SELF.pr, head: 'feature/self', labels: ['priority'] }), fixPull];
  const flagged = { runs: [...own.runs, fixRun], pulls };
  assert.deepEqual(verdict(flagged, SELF), { wait: false, reason: 'this PR is priority now' });
});

test('this run itself never counts', () => {
  const pulls = [aPull({ number: SELF.pr, head: 'fix/a' })];
  const runs = [aRun({ id: SELF.run, head_branch: 'develop', event: 'push' })];
  assert.equal(verdict({ runs, pulls }, SELF).wait, false);
});
