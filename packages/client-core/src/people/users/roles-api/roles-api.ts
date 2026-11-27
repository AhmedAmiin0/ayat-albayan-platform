import { roleRoutes as routes } from '@ab/catalog';
import { callWith, type ApiClient } from '../../../core/http';
import type { RoleCalls } from './roles-api.types';

/** Roles and staff role assignment on one api client, paths and answers from routes. */
export function roleCalls(client: ApiClient): RoleCalls {
  const call = callWith(client);
  return {
    list: () => call({ route: routes.list }),
    staffUsers: () => call({ route: routes.staffUsers }),
    create: (body) => call({ route: routes.create, body }),
    update: (id, body) => call({ route: routes.update, params: { id }, body }),
    reset: (id) => call({ route: routes.reset, params: { id } }),
    remove: (id) => call({ route: routes.remove, params: { id } }),
    assign: (id, body) => call({ route: routes.assign, params: { id }, body }),
  };
}
