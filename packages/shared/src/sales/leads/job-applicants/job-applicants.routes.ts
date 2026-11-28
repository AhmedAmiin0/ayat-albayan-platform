import { defineRoute, id, pageOf } from '@ab/core';
import { z } from 'zod';
import {
  jobApplicantCreateBodySchema,
  jobApplicantListQuerySchema,
  jobApplicantStatusBodySchema,
  jobApplicantUpdateBodySchema,
  jobApplicantViewSchema,
} from './job-applicants.schemas';

const byId = z.object({ id: id() });
const READ = { permissions: ['applicants.read'], tags: ['job-applicants'] } as const;
const WRITE = { permissions: ['applicants.write'], tags: ['job-applicants'] } as const;

/** Job applicants, kept apart from the sales funnel (R-LEAD-04). */
export const jobApplicantRoutes = {
  list: defineRoute({
    ...READ,
    method: 'GET',
    path: '/job-applicants',
    query: jobApplicantListQuerySchema,
    response: pageOf(jobApplicantViewSchema),
  }),
  get: defineRoute({
    ...READ,
    method: 'GET',
    path: '/job-applicants/:id',
    params: byId,
    response: jobApplicantViewSchema,
  }),
  create: defineRoute({
    ...WRITE,
    method: 'POST',
    path: '/job-applicants',
    body: jobApplicantCreateBodySchema,
    response: jobApplicantViewSchema,
  }),
  update: defineRoute({
    ...WRITE,
    method: 'PATCH',
    path: '/job-applicants/:id',
    params: byId,
    body: jobApplicantUpdateBodySchema,
    response: jobApplicantViewSchema,
  }),
  changeStatus: defineRoute({
    ...WRITE,
    method: 'PATCH',
    path: '/job-applicants/:id/status',
    params: byId,
    body: jobApplicantStatusBodySchema,
    response: jobApplicantViewSchema,
  }),
  remove: defineRoute({
    ...WRITE,
    method: 'DELETE',
    path: '/job-applicants/:id',
    params: byId,
    response: 'empty',
  }),
};
