import { guardianRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { GuardianCalls } from './guardians-api.types';

/** Guardians (R-STU-02, R-STU-04, admin only) on one api client, paths and answers from routes. */
export function guardianCalls(client: ApiClient): GuardianCalls {
  const call = callWith(client);
  return {
    get: (id) => call({ route: routes.get, params: { id } }),
    update: (id, body) => call({ route: routes.update, params: { id }, body }),
    removePhone: (params) => call({ route: routes.removePhone, params }),
  };
}
