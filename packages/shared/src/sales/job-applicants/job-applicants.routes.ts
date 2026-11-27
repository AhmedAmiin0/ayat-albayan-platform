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

/** Job applicants, kept apart from the sales funnel (R-LEAD-04). */
export const jobApplicantRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/job-applicants',
    query: jobApplicantListQuerySchema,
    response: pageOf(jobApplicantViewSchema),
  }),
  get: defineRoute({
    method: 'GET',
    path: '/job-applicants/:id',
    params: byId,
    response: jobApplicantViewSchema,
  }),
  create: defineRoute({
    method: 'POST',
    path: '/job-applicants',
    body: jobApplicantCreateBodySchema,
    response: jobApplicantViewSchema,
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/job-applicants/:id',
    params: byId,
    body: jobApplicantUpdateBodySchema,
    response: jobApplicantViewSchema,
  }),
  changeStatus: defineRoute({
    method: 'PATCH',
    path: '/job-applicants/:id/status',
    params: byId,
    body: jobApplicantStatusBodySchema,
    response: jobApplicantViewSchema,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/job-applicants/:id',
    params: byId,
    response: 'empty',
  }),
};
