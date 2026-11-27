import { z } from 'zod';

// Who asked to move a lesson (R-SCH-08): teacher or family; staff answer both the same way.

export const PROPOSAL_REQUESTERS = ['teacher', 'family'] as const;
export const proposalRequesterSchema = z.enum(PROPOSAL_REQUESTERS);
export type ProposalRequester = z.infer<typeof proposalRequesterSchema>;

/** Is this the family's own request (and not a teacher's proposal)? */
export const isFamilyRequest = (p: { requested_by?: ProposalRequester } | null): boolean =>
  p?.requested_by === 'family';
