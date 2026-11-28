import { salesAssignRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { SalesAssignCalls } from './assign-api.types';

/** The admin's lead ownership calls, on one api client. */
export function salesAssignCalls(client: ApiClient): SalesAssignCalls {
  const call = callWith(client);
  return {
    people: () => call({ route: salesAssignRoutes.people }),
    assignUnassigned: () => call({ route: salesAssignRoutes.assignUnassigned }),
    assign: ({ leadId, profileId }) =>
      call({ route: salesAssignRoutes.assign, params: { id: leadId }, body: { profileId } }),
  };
}
