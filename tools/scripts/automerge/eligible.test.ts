import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notEligible } from './eligible.ts';
import { aFacts, withPr } from './testing/facts.builder.ts';

test('a ready same-repo lane PR into develop with the label is eligible', () => {
  assert.equal(notEligible(aFacts().pr), null);
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
  for (const [over, reason] of cases) assert.match(notEligible(withPr(over).pr) ?? '', reason);
});
