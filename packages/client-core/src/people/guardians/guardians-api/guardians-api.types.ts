import type { RouteBody, RouteResult } from '@ab/core';
import type { guardianRoutes } from '@ab/shared';

type Routes = typeof guardianRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface GuardianPhoneRef {
  id: string;
  phone: string;
}

export interface GuardianCalls {
  get: (id: string) => Answer<'get'>;
  update: (id: string, patch: RouteBody<Routes['update']>) => Answer<'update'>;
  removePhone: (ref: GuardianPhoneRef) => Answer<'removePhone'>;
}
