import { usersRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { UserCalls } from './users-api.types';

/** The staff directory of logins on one api client, paths and answers from routes. */
export function userCalls(client: ApiClient): UserCalls {
  const call = callWith(client);
  return {
    list: (query) => call({ route: routes.list, query }),
    roleOptions: () => call({ route: routes.roleOptions }),
    linkCandidates: (query) => call({ route: routes.linkCandidates, query }),
    read: (id) => call({ route: routes.read, params: { id } }),
    create: (body) => call({ route: routes.create, body }),
    update: (id, body) => call({ route: routes.update, params: { id }, body }),
    disable: (id, body) => call({ route: routes.disable, params: { id }, body }),
    enable: (id) => call({ route: routes.enable, params: { id } }),
    resetPassword: (id, body) => call({ route: routes.resetPassword, params: { id }, body }),
    signOut: (id) => call({ route: routes.signOut, params: { id } }),
    remove: (id) => call({ route: routes.remove, params: { id } }),
  };
}
