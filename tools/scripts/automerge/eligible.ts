import type { Facts } from './facts.schemas.ts';
import { LABEL, laneOf } from './lanes.ts';
import { notReviewed } from './reviewed.ts';

interface Gate {
  fails: (f: Facts) => boolean;
  reason: (f: Facts) => string;
}

const GATES: readonly Gate[] = [
  { fails: ({ pr }) => pr.isDraft, reason: () => 'draft' },
  { fails: ({ pr }) => pr.isCrossRepository, reason: () => 'head is a fork' },
  { fails: ({ pr }) => pr.baseRefName !== 'develop', reason: ({ pr }) => `base ${pr.baseRefName}` },
  {
    fails: (f) => laneOf(f.pr.headRefName) === null && notReviewed(f) !== null,
    reason: (f) => `${f.pr.headRefName} is not an auto-merge lane (${notReviewed(f) ?? ''})`,
  },
  {
    fails: ({ pr }) => !pr.labels.some((l) => l.name === LABEL),
    reason: () => `no ${LABEL} label`,
  },
];

/** Why this PR is not an auto-merge candidate, or null when it is: a lane, or freshly reviewed. */
export function notEligible(f: Facts): string | null {
  const gate = GATES.find((g) => g.fails(f));
  return gate ? gate.reason(f) : null;
}
