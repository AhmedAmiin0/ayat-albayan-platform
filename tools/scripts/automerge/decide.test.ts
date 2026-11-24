import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide } from './decide.ts';
import { aFacts, aReviewedFacts, aRun, HEAD, withPr } from './testing/facts.builder.ts';
import { staleComment } from './lockfile.ts';

const action = (facts: ReturnType<typeof aFacts>) => decide(facts).action;
const lockPr = () => ({ ...aFacts(), files: [{ filename: 'pnpm-lock.yaml' }] });
const OLD = { base_commit: { sha: 'd'.repeat(40) }, merge_base_commit: { sha: 'b'.repeat(40) } };

test('a green eligible PR merges', () => {
  assert.deepEqual(decide(aFacts()), { action: 'merge', reason: 'every condition holds' });
  assert.equal(action(lockPr()), 'merge');
});

test('an ineligible, red, widened or unmergeable PR is skipped', () => {
  const red = { ...aFacts(), checks: [aRun('check', { conclusion: 'failure' })] };
  const wide = { ...aFacts(), annotations: [{ title: null, message: 'layer table widened' }] };
  for (const facts of [withPr({ isDraft: true }), red, wide]) assert.equal(action(facts), 'skip');
  for (const mergeable of ['CONFLICTING', 'UNKNOWN'])
    assert.match(decide(withPr({ mergeable })).reason, new RegExp(mergeable));
});

test('a stale lockfile PR gets one comment, then waits', () => {
  const stale = { ...lockPr(), compare: OLD };
  assert.deepEqual(decide(stale), { action: 'comment', reason: 'needs update from develop' });
  const asked = { ...stale, comments: [{ body: staleComment(HEAD) }] };
  assert.equal(action(asked), 'skip');
});

test('eligibility is decided before anything else', () => {
  const facts = { ...withPr({ labels: [] }), compare: OLD, files: [{ filename: 'package.json' }] };
  assert.match(decide(facts).reason, /no auto-merge label/);
});

test('a reviewed non-lane PR merges only when green too; a stale review skips', () => {
  assert.equal(action(aReviewedFacts()), 'merge');
  const red = { ...aReviewedFacts(), checks: [aRun('check', { conclusion: 'failure' })] };
  assert.equal(action(red), 'skip');
  const pushed = { ...aReviewedFacts(), suites: [{ created_at: '2026-11-23T01:00:00Z' }] };
  assert.match(decide(pushed).reason, /head is newer than the review/);
});

test('a PR whose title breaks the angular header is skipped, naming the rule', () => {
  const reason = decide(withPr({ title: 'Cut shared from db' })).reason;
  assert.match(reason, /^title: the header is not <type>\(<scope>\): <subject>/);
});
