import { pushTokenRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { PushTokenCalls } from './push-tokens-api.types';

/** This device's push registration (R-MOB-01) on one api client, paths and answers from routes. */
export function pushTokenCalls(client: ApiClient): PushTokenCalls {
  const call = callWith(client);
  return {
    add: (body) => call({ route: routes.add, body }),
    remove: (token) => call({ route: routes.remove, params: { token } }),
  };
}
