import { describe, expect, it } from 'vitest';
import {
  APPLICANT_STATUSES,
  canTransitionApplicant,
  isApplicantStatus,
  type ApplicantStatus,
} from './applicant-state-machine';

// Expected table written out independently of the implementation (R-LEAD-04).
const ALLOWED: Record<ApplicantStatus, ApplicantStatus[]> = {
  new: ['reviewing'],
  reviewing: ['interview'],
  interview: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
};

const PAIRS = APPLICANT_STATUSES.flatMap((from) =>
  APPLICANT_STATUSES.map((to) => [from, to, ALLOWED[from].includes(to)] as const),
);

describe('ApplicantStateMachine (R-LEAD-04)', () => {
  it('covers every status pair', () => {
    expect(PAIRS).toHaveLength(25);
  });

  it.each(PAIRS)('%s → %s allowed: %s', (from, to, expected) => {
    expect(canTransitionApplicant(from, to)).toBe(expected);
  });

  it('a stored value outside the pipeline (legacy "contacted") cannot move', () => {
    expect(isApplicantStatus('contacted')).toBe(false);
    for (const to of APPLICANT_STATUSES) expect(canTransitionApplicant('contacted', to)).toBe(false);
  });
});
