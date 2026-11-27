import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { lessonViewSchema } from '../lesson-view';
import { approveDecisionSchema, rejectDecisionSchema } from '../lesson-proposals';
import { familyRequestsSchema } from './family-requests.schemas';

const byId = z.object({ id: z.uuid() });
const requests = { permissions: ['lessons.reschedule'], tags: ['lessons'] } as const;

/** Admins see every family request, the owning assistant hers; approve is a reschedule. */
export const familyRequestRoutes = {
  /** A closed lesson's request is moot and left out. */
  pending: defineRoute({
    method: 'GET',
    path: '/family-requests',
    response: familyRequestsSchema,
    ...requests,
  }),
  /** The moved lesson; 403 not_your_student, 409 conflict or proposal_decided. */
  approve: defineRoute({
    method: 'POST',
    path: '/family-requests/:id/approve',
    params: byId,
    body: approveDecisionSchema,
    response: lessonViewSchema,
    ...requests,
  }),
  /** The unchanged lesson; the family hears the decline with the note. */
  reject: defineRoute({
    method: 'POST',
    path: '/family-requests/:id/reject',
    params: byId,
    body: rejectDecisionSchema,
    response: lessonViewSchema,
    ...requests,
  }),
};
