import { JOB_APPLICANT_STATUSES, type JobApplicantStatus } from '@ab/shared';

export const APPLICANT_STATUSES = JOB_APPLICANT_STATUSES;
export type ApplicantStatus = JobApplicantStatus;

/**
 * Applicant pipeline (R-LEAD-04): new → reviewing → interview → accepted | rejected.
 * TODO(R-LEAD-04): can an applicant be rejected before the interview? Not allowed until confirmed.
 */
const APPLICANT_TRANSITIONS: Record<ApplicantStatus, readonly ApplicantStatus[]> = {
  new: ['reviewing'],
  reviewing: ['interview'],
  interview: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
};

export function isApplicantStatus(value: string): value is ApplicantStatus {
  return (APPLICANT_STATUSES as readonly string[]).includes(value);
}

/** `from` is the stored DB value; anything outside the pipeline cannot move. */
export function canTransitionApplicant(from: string, to: ApplicantStatus): boolean {
  return isApplicantStatus(from) && APPLICANT_TRANSITIONS[from].includes(to);
}
