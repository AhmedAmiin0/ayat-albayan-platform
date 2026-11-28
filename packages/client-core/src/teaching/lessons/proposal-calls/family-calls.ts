import { familyRequestRoutes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { FamilyRequestCalls } from './proposal-calls.types';

/** Family requests waiting for staff, approve and reject; answers parsed strictly. */
export function familyRequestCalls(client: ApiClient): FamilyRequestCalls {
  const call = callWith(client);
  return {
    pending: () => call({ route: familyRequestRoutes.pending }),
    approve: (params, body) => call({ route: familyRequestRoutes.approve, params, body }),
    reject: (params, body) => call({ route: familyRequestRoutes.reject, params, body }),
  };
}
