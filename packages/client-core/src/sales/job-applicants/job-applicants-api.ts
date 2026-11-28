import { jobApplicantRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { JobApplicantCalls } from './job-applicants-api.types';

/** The job applicants' calls on one api client (R-LEAD-04). */
export function jobApplicantCalls(client: ApiClient): JobApplicantCalls {
  const call = callWith(client);
  return {
    list: (query) => call({ route: jobApplicantRoutes.list, query }),
    get: (id) => call({ route: jobApplicantRoutes.get, params: { id } }),
    create: (body) => call({ route: jobApplicantRoutes.create, body }),
    update: ({ id, body }) => call({ route: jobApplicantRoutes.update, params: { id }, body }),
    changeStatus: ({ id, status }) =>
      call({ route: jobApplicantRoutes.changeStatus, params: { id }, body: { status } }),
    remove: (id) => call({ route: jobApplicantRoutes.remove, params: { id } }),
  };
}
