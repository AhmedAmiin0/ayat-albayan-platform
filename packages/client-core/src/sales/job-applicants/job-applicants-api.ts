import { jobApplicantRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { JobApplicantCalls } from './job-applicants-api.types';

/** The job applicants' calls on one api client (R-LEAD-04). */
export function jobApplicantCalls(client: ApiClient): JobApplicantCalls {
  const call = callWith(client);
  return {
    list: (query) => call({ route: routes.list, query }),
    get: (id) => call({ route: routes.get, params: { id } }),
    create: (body) => call({ route: routes.create, body }),
    update: ({ id, body }) => call({ route: routes.update, params: { id }, body }),
    changeStatus: ({ id, status }) =>
      call({ route: routes.changeStatus, params: { id }, body: { status } }),
    remove: (id) => call({ route: routes.remove, params: { id } }),
  };
}
