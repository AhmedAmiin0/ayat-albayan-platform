import { defineRoute, id, pageOf } from '@ab/core';
import { z } from 'zod';
import { leadFollowUpSchema, leadQualificationPatchSchema } from '../../messaging';
import { jobApplicantViewSchema } from './job-applicants';
import {
  leadListItemSchema,
  leadListQuerySchema,
  leadRowSchema,
  leadStatusBodySchema,
} from './leads.schemas';

const byId = z.object({ id: id() });
const READ = { permissions: ['leads.read'], tags: ['leads'] } as const;
const WRITE = { permissions: ['leads.write'], tags: ['leads'] } as const;

/** The admin's lead inbox (R-LEAD-01); search escaping happens in the api repo. */
export const leadReadRoutes = {
  list: defineRoute({
    ...READ,
    method: 'GET',
    path: '/leads',
    query: leadListQuerySchema,
    response: pageOf(leadListItemSchema),
  }),
};

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
