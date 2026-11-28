import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { leadFollowUpSchema, leadQualificationPatchSchema } from '../../messaging';
import { jobApplicantViewSchema } from './job-applicants';
import { leadRowSchema, leadStatusBodySchema } from './leads.schemas';

const byId = z.object({ id: id() });
const WRITE = { permissions: ['leads.write'], tags: ['leads'] } as const;

/** The admin's writes on one lead (R-LEAD-01, R-LEAD-03 to R-LEAD-05). */
export const leadWriteRoutes = {
  /** Through the LeadStateMachine; 409 invalid_transition. */
  changeStatus: defineRoute({
    ...WRITE,
    method: 'PATCH',
    path: '/leads/:id/status',
    params: byId,
    body: leadStatusBodySchema,
    response: leadRowSchema,
  }),
  /** One click: the lead becomes a job applicant and leaves the funnel. */
  reclassify: defineRoute({
    ...WRITE,
    method: 'POST',
    path: '/leads/:id/reclassify',
    params: byId,
    response: jobApplicantViewSchema,
  }),
  /** Merged into leads.qualification; null clears a field. */
  qualification: defineRoute({
    ...WRITE,
    method: 'PATCH',
    path: '/leads/:id/qualification',
    params: byId,
    body: leadQualificationPatchSchema,
    response: leadRowSchema,
  }),
  /** The admin's per-lead follow-up pause. */
  followUp: defineRoute({
    ...WRITE,
    method: 'PATCH',
    path: '/leads/:id/follow-up',
    params: byId,
    body: leadFollowUpSchema,
    response: leadRowSchema,
  }),
};
