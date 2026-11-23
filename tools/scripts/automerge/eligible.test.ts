import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notEligible } from './eligible.ts';
import { aFacts, aReviewedFacts, withPr } from './testing/facts.builder.ts';

test('a ready same-repo lane PR into develop with the label is eligible', () => {
  assert.equal(notEligible(aFacts()), null);
});

test('each missing condition says why, in the order they are checked', () => {
  const cases: readonly [Parameters<typeof withPr>[0], RegExp][] = [
    [{ isDraft: true }, /draft/],
    [{ isCrossRepository: true }, /fork/],
    [{ baseRefName: 'main' }, /base main/],
    [{ headRefName: 'feature/x' }, /feature\/x is not an auto-merge lane/],
    [{ labels: [] }, /no auto-merge label/],
    [{ labels: [{ name: 'automerge' }, { name: 'lane' }] }, /no auto-merge label/],
    [{ isDraft: true, headRefName: 'feature/x' }, /draft/],
  ];
  for (const [over, reason] of cases) assert.match(notEligible(withPr(over)) ?? '', reason);
});

test('a non-lane branch is eligible only through a fresh review, and says why not', () => {
  assert.equal(notEligible(aReviewedFacts()), null);
  const stale = { ...aReviewedFacts(), suites: [{ created_at: '2026-11-23T01:00:00Z' }] };
  const why = /not an auto-merge lane \(head is newer than the review\)/;
  assert.match(notEligible(stale) ?? '', why);
  const pr = { ...aReviewedFacts().pr, labels: [{ name: 'reviewed' }] };
  const noLabel = { ...aReviewedFacts(), pr };
  assert.match(notEligible(noLabel) ?? '', /no auto-merge label/);
});

test('a lane branch needs no review', () => {
  assert.equal(notEligible({ ...aFacts(), events: [], suites: [] }), null);
});
