import type { Pr } from './facts.schemas.ts';
import { LABEL, laneOf } from './lanes.ts';

interface Gate {
  fails: (pr: Pr) => boolean;
  reason: (pr: Pr) => string;
}

const GATES: readonly Gate[] = [
  { fails: (pr) => pr.isDraft, reason: () => 'draft' },
  { fails: (pr) => pr.isCrossRepository, reason: () => 'head is a fork' },
  { fails: (pr) => pr.baseRefName !== 'develop', reason: (pr) => `base ${pr.baseRefName}` },
  {
    fails: (pr) => laneOf(pr.headRefName) === null,
    reason: (pr) => `${pr.headRefName} is not an auto-merge lane`,
  },
  {
    fails: (pr) => !pr.labels.some((l) => l.name === LABEL),
    reason: () => `no ${LABEL} label`,
  },
];

/** Why this PR is not an auto-merge candidate, or null when it is. */
export function notEligible(pr: Pr): string | null {
  const gate = GATES.find((g) => g.fails(pr));
  return gate ? gate.reason(pr) : null;
}
