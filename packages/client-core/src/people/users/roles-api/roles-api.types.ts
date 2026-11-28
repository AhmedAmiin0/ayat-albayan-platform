import type { roleRoutes } from '@ab/catalog';
import type { RouteBody, RouteResult } from '@ab/core';

type Routes = typeof roleRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface RoleCalls {
  list: () => Answer<'list'>;
  staffUsers: () => Answer<'staffUsers'>;
  create: (body: RouteBody<Routes['create']>) => Answer<'create'>;
  update: (id: string, patch: RouteBody<Routes['update']>) => Answer<'update'>;
  reset: (id: string) => Answer<'reset'>;
  remove: (id: string) => Answer<'remove'>;
  /** Gives the staff user `id` the role `role_id`. */
  assign: (id: string, body: RouteBody<Routes['assign']>) => Answer<'assign'>;
}
