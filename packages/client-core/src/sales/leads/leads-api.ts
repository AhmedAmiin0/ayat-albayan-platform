import { leadWriteRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { LeadWriteCalls } from './leads-api.types';

/** The admin's writes on one lead, on one api client (R-LEAD-03 to R-LEAD-05). */
export function leadWriteCalls(client: ApiClient): LeadWriteCalls {
  const call = callWith(client);
  return {
    changeStatus: ({ id, status }) =>
      call({ route: routes.changeStatus, params: { id }, body: { status } }),
    reclassify: (id) => call({ route: routes.reclassify, params: { id } }),
    qualification: ({ id, patch }) =>
      call({ route: routes.qualification, params: { id }, body: patch }),
    followUp: ({ id, paused }) =>
      call({ route: routes.followUp, params: { id }, body: { paused } }),
  };
}
