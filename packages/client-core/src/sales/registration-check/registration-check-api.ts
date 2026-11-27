import { registrationCheckRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { RegistrationCheckCalls } from './registration-check-api.types';

/** The registration check on one api client (docs/16 row 23). */
export function registrationCheckCalls(client: ApiClient): RegistrationCheckCalls {
  const call = callWith(client);
  return {
    check: (query) => call({ route: routes.check, query }),
  };
}
