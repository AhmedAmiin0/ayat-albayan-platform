import type { Facts } from './facts.schemas.ts';
import { LABEL, laneOf } from './lanes.ts';
import { isPriority, notPriority } from './priority.ts';
import { notReviewed } from './reviewed.ts';

const flagged = (f: Facts): boolean => notPriority(f) === null;
const notLane = (f: Facts): string =>
  isPriority(f.pr)
    ? `priority, but ${notPriority(f) ?? ''}`
    : `${f.pr.headRefName} is not an auto-merge lane (${notReviewed(f) ?? ''})`;

interface Gate {
  fails: (f: Facts) => boolean;
  reason: (f: Facts) => string;
}

const GATES: readonly Gate[] = [
  { fails: ({ pr }) => pr.isDraft, reason: () => 'draft' },
  { fails: ({ pr }) => pr.isCrossRepository, reason: () => 'head is a fork' },
  { fails: ({ pr }) => pr.baseRefName !== 'develop', reason: ({ pr }) => `base ${pr.baseRefName}` },
  {
    fails: (f) => laneOf(f.pr.headRefName) === null && notReviewed(f) !== null && !flagged(f),
    reason: notLane,
  },
  {
    fails: (f) => !f.pr.labels.some((l) => l.name === LABEL) && !flagged(f),
    reason: () => `no ${LABEL} label`,
  },
];

/**
 * Why this PR is not an auto-merge candidate, or null when it is: a lane, freshly reviewed, or
 * flagged priority (which needs no auto-merge label).
 */
export function notEligible(f: Facts): string | null {
  const gate = GATES.find((g) => g.fails(f));
  return gate ? gate.reason(f) : null;
}
