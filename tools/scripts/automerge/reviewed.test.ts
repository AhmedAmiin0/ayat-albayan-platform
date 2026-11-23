import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Facts } from './facts.schemas.ts';
import { notReviewed } from './reviewed.ts';
import { aReviewedFacts, HEAD_AT, labelled } from './testing/facts.builder.ts';

const AFTER = '2026-11-23T01:00:00Z';
const BEFORE = '2026-11-22T23:00:00Z';

test('a reviewed PR whose label is newer than its head and owns no gated file passes', () => {
  assert.equal(notReviewed(aReviewedFacts()), null);
});

const files = (filename: string, previous: string | null = null): Partial<Facts> => ({
  files: [{ filename, previous_filename: previous }],
});
const pr = (over: Partial<Facts['pr']>): Partial<Facts> => ({
  pr: { ...aReviewedFacts().pr, ...over },
});
const forced = (created_at: string): Facts['events'][number] => ({
  event: 'head_ref_force_pushed',
  label: null,
  created_at,
});
const forcedAfter: Partial<Facts> = {
  suites: [{ created_at: '2026-11-22T22:00:00Z' }],
  events: [...labelled(BEFORE), forced(AFTER)],
};

const CASES: readonly [string, Partial<Facts>, RegExp][] = [
  ['no reviewed label', pr({ labels: [{ name: 'auto-merge' }] }), /not reviewed/],
  ['the auto-merge workflow branch', pr({ headRefName: 'ci/lane-automerge' }), /owner merges/],
  ['deploy-staging', files('.github/workflows/deploy-staging.yml'), /owner merges/],
  ['db-migrate', files('.github/workflows/db-migrate.yml'), /owner merges/],
  ['the layer table', files('refactor/guards/packages.json'), /owner merges/],
  ['the auto-merge workflow', files('.github/workflows/lane-automerge.yml'), /owner merges/],
  ['the merge rules', files('tools/scripts/automerge/decide.ts'), /owner merges/],
  ['the workflow test', files('tools/scripts/ci-checks/lane-automerge.test.mjs'), /owner merges/],
  ['a gated file renamed away', files('x.yml', '.github/workflows/db-migrate.yml'), /owner merges/],
  ['a commit after the review', { suites: [{ created_at: AFTER }] }, /newer than the review/],
  ['label in the head second', { events: labelled(HEAD_AT) }, /newer than the review/],
  ['no check suite on the head', { suites: [] }, /newer than the review/],
  ['no labeled event found', { events: [] }, /newer than the review/],
  ['a force push after the review', forcedAfter, /force-pushed/],
];

test('each missing review condition says why', () => {
  for (const [name, over, reason] of CASES)
    assert.match(notReviewed({ ...aReviewedFacts(), ...over }) ?? 'passed', reason, name);
});

test('the newest reviewed label counts; other labels and older force pushes do not', () => {
  const events = [
    ...labelled(BEFORE),
    forced('2026-11-22T23:59:00Z'),
    ...labelled(AFTER),
    { event: 'labeled', label: 'auto-merge', created_at: BEFORE },
  ];
  const suites = [{ created_at: '2026-11-23T00:30:00Z' }, { created_at: '2026-11-23T00:40:00Z' }];
  assert.equal(notReviewed({ ...aReviewedFacts(), events, suites }), null);
});

test('the earliest check suite dates the head: a re-run suite cannot make it look older', () => {
  const suites = [{ created_at: '2026-11-23T02:00:00Z' }, { created_at: '2026-11-23T00:30:00Z' }];
  assert.equal(notReviewed({ ...aReviewedFacts(), suites }), null);
  const late = { ...aReviewedFacts(), suites: [{ created_at: AFTER }] };
  assert.match(notReviewed(late) ?? '', /newer/);
});
