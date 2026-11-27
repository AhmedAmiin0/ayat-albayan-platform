import { defineRoute } from '@ab/core';
import { z } from 'zod';
import {
  lessonProposalRequestSchema,
  proposalApproveSchema,
  proposalRejectSchema,
  type ProposalApprove,
  type ProposalReject,
} from '../../schemas';
import { lessonViewListSchema, lessonViewSchema } from '../lesson-view';

const byId = z.object({ id: z.uuid() });
const decisions = { permissions: ['lessons.write'], tags: ['lessons'] } as const;

/** A decision sent without a JSON body is the empty one. */
const approveBody = z.preprocess(
  (value: ProposalApprove | null | undefined) => value ?? {},
  proposalApproveSchema,
);
const rejectBody = z.preprocess(
  (value: ProposalReject | null | undefined) => value ?? {},
  proposalRejectSchema,
);

/** Staff answers to teacher proposals and family requests (R-SCH-08). */
export const lessonProposalRoutes = {
  /** Lessons still open with a proposal waiting; a closed lesson's proposal is moot. */
  pending: defineRoute({
    method: 'GET',
    path: '/lesson-proposals',
    response: lessonViewListSchema,
    ...decisions,
  }),
  /** The moved lesson; 409 conflict (retry with override.reason), 409 proposal_decided. */
  approve: defineRoute({
    method: 'POST',
    path: '/lesson-proposals/:id/approve',
    params: byId,
    body: approveBody,
    response: lessonViewSchema,
    ...decisions,
  }),
  /** The note reaches the family with a declined request. */
  reject: defineRoute({
    method: 'POST',
    path: '/lesson-proposals/:id/reject',
    params: byId,
    body: rejectBody,
    response: lessonViewSchema,
    ...decisions,
  }),
};

/** The teacher asks for another time for her own lesson; 201 with the pending proposal. */
export const lessonProposeRoutes = {
  propose: defineRoute({
    method: 'POST',
    path: '/lessons/:id/propose',
    params: byId,
    body: lessonProposalRequestSchema,
    response: lessonViewSchema,
    permissions: ['self.teacher'],
    tags: ['lessons'],
  }),
};
