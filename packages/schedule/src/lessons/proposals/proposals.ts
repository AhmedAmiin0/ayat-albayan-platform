// Who asked to move a lesson (R-SCH-08): teacher or family; staff answer both the same way.

export const PROPOSAL_REQUESTERS = ['teacher', 'family'] as const;
export type ProposalRequester = (typeof PROPOSAL_REQUESTERS)[number];

/** A proposed new time for one lesson; staff approve (a reschedule) or reject. */
export interface LessonProposalView {
  id: string;
  proposed_starts_at: string;
  note: string | null;
  created_at: string;
  /** Absent in an old cache: the teacher's. */
  requested_by?: ProposalRequester;
}

/** Is this the family's own request (and not a teacher's proposal)? */
export const isFamilyRequest = (p: Pick<LessonProposalView, 'requested_by'> | null): boolean =>
  p?.requested_by === 'family';
