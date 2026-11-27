import { roleRoutes } from '@ab/catalog';
import { callWith, type ApiClient } from '../../../core/http';
import type { RoleCalls } from './roles-api.types';

/** Roles and staff role assignment on one api client, paths and answers from roleRoutes. */
export function roleCalls(client: ApiClient): RoleCalls {
  const call = callWith(client);
  return {
    list: () => call({ route: roleRoutes.list }),
    staffUsers: () => call({ route: roleRoutes.staffUsers }),
    create: (body) => call({ route: roleRoutes.create, body }),
    update: (id, body) => call({ route: roleRoutes.update, params: { id }, body }),
    reset: (id) => call({ route: roleRoutes.reset, params: { id } }),
    remove: (id) => call({ route: roleRoutes.remove, params: { id } }),
    assign: (id, body) => call({ route: roleRoutes.assign, params: { id }, body }),
  };
}
