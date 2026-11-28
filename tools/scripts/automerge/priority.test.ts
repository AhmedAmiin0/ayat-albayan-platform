import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notEligible } from './eligible.ts';
import { isPriority, needsUpdate, notPriority } from './priority.ts';
import { aFacts, aPriorityFacts, aReviewedFacts } from './testing/facts.builder.ts';

const flagged = (over: Partial<ReturnType<typeof aPriorityFacts>['pr']>) => {
  const facts = aPriorityFacts();
  return { ...facts, pr: { ...facts.pr, ...over } };
};
const behind = { known: true, files: [{ filename: 'apps/api/src/a.ts' }] };

test('only the priority label flags a PR', () => {
  assert.equal(isPriority(aPriorityFacts().pr), true);
  assert.equal(isPriority(aFacts().pr), false);
  assert.equal(isPriority(flagged({ labels: [{ name: 'Priority' }] }).pr), false);
});

test('a flagged PR into develop is eligible with no auto-merge or reviewed label', () => {
  assert.equal(notPriority(aPriorityFacts()), null);
  assert.equal(notEligible(aPriorityFacts()), null);
});

test('a flagged PR is refused when draft, a fork or not into develop', () => {
  const cases: readonly [Parameters<typeof flagged>[0], RegExp][] = [
    [{ isDraft: true }, /draft/],
    [{ isCrossRepository: true }, /fork/],
    [{ baseRefName: 'main' }, /base main/],
  ];
  for (const [over, reason] of cases) assert.match(notEligible(flagged(over)) ?? '', reason);
});

test('removing the label stops the merge', () => {
  const removed = flagged({ labels: [] });
  assert.equal(notPriority(removed), 'not priority');
  assert.match(notEligible(removed) ?? '', /fix\/wa-retry is not an auto-merge lane/);
});

test('the flag never merges what the owner merges', () => {
  const gated = { ...aPriorityFacts(), files: [{ filename: 'tools/scripts/automerge/x.ts' }] };
  assert.equal(notPriority(gated), 'changes a file the owner merges');
  assert.match(notEligible(gated) ?? '', /priority, but changes a file the owner merges/);
  const owner = flagged({ headRefName: 'ci/lane-automerge' });
  assert.match(notEligible(owner) ?? '', /priority, but the owner merges it/);
});

test('a flagged PR merges whatever its review says; a stale review does not block it', () => {
  const reviewed = aReviewedFacts();
  const pr = { ...reviewed.pr, labels: [{ name: 'reviewed' }, { name: 'priority' }] };
  const stale = { ...reviewed, pr, suites: [{ created_at: '2026-11-23T01:00:00Z' }] };
  assert.equal(notEligible(stale), null);
});

test('a flagged PR behind develop needs an update; unknown or level does not', () => {
  assert.equal(needsUpdate({ ...aPriorityFacts(), behind }), true);
  assert.equal(needsUpdate(aPriorityFacts()), false);
  assert.equal(needsUpdate({ ...aPriorityFacts(), behind: { known: false, files: [] } }), false);
  assert.equal(needsUpdate({ ...aFacts(), behind }), false, 'other PRs are never updated');
});
