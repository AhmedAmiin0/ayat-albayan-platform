import { usersRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { UserCalls } from './users-api.types';

/** The staff directory of logins on one api client, paths and answers from usersRoutes. */
export function userCalls(client: ApiClient): UserCalls {
  const call = callWith(client);
  return {
    list: (query) => call({ route: usersRoutes.list, query }),
    roleOptions: () => call({ route: usersRoutes.roleOptions }),
    linkCandidates: (query) => call({ route: usersRoutes.linkCandidates, query }),
    read: (id) => call({ route: usersRoutes.read, params: { id } }),
    create: (body) => call({ route: usersRoutes.create, body }),
    update: (id, body) => call({ route: usersRoutes.update, params: { id }, body }),
    disable: (id, body) => call({ route: usersRoutes.disable, params: { id }, body }),
    enable: (id) => call({ route: usersRoutes.enable, params: { id } }),
    resetPassword: (id, body) => call({ route: usersRoutes.resetPassword, params: { id }, body }),
    signOut: (id) => call({ route: usersRoutes.signOut, params: { id } }),
    remove: (id) => call({ route: usersRoutes.remove, params: { id } }),
  };
}
