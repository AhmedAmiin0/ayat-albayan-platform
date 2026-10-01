// TODO(R-LEAD-04): replace with JOB_APPLICANT_STATUSES from @ab/shared once migration 040 is
// applied, types are regenerated and the shared enum lists these five values.
export const APPLICANT_STATUSES = ['new', 'reviewing', 'interview', 'accepted', 'rejected'] as const;
export type ApplicantStatus = (typeof APPLICANT_STATUSES)[number];

/**
 * Applicant pipeline (R-LEAD-04): new → reviewing → interview → accepted | rejected.
 * TODO(R-LEAD-04): can an applicant be rejected before the interview? Not allowed until confirmed.
 */
export const APPLICANT_TRANSITIONS: Record<ApplicantStatus, readonly ApplicantStatus[]> = {
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
