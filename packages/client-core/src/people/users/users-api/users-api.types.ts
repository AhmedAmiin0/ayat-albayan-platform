import type { RouteBody, RouteQuery, RouteResult } from '@ab/core';
import type { usersRoutes } from '@ab/shared';

type Routes = typeof usersRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;
type ById<K extends keyof Routes> = (id: string) => Answer<K>;
type Change<K extends keyof Routes> = (id: string, body: RouteBody<Routes[K]>) => Answer<K>;

export interface UserCalls {
  list: (query: RouteQuery<Routes['list']>) => Answer<'list'>;
  roleOptions: () => Answer<'roleOptions'>;
  linkCandidates: (query: RouteQuery<Routes['linkCandidates']>) => Answer<'linkCandidates'>;
  read: ById<'read'>;
  /** The credential in the answer is shown once and never kept in the query cache. */
  create: (body: RouteBody<Routes['create']>) => Answer<'create'>;
  update: Change<'update'>;
  disable: Change<'disable'>;
  enable: ById<'enable'>;
  resetPassword: Change<'resetPassword'>;
  signOut: ById<'signOut'>;
  remove: ById<'remove'>;
}
