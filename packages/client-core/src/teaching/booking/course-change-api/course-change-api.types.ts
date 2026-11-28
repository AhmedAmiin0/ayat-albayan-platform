import type { RouteBody, RouteResult } from '@ab/core';
import type { courseChangeRoutes } from '@ab/shared';

type Routes = typeof courseChangeRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface CourseChangeCalls {
  view: (subscriptionId: string) => Answer<'view'>;
  check: (body: RouteBody<Routes['check']>) => Answer<'check'>;
  change: (body: RouteBody<Routes['change']>) => Answer<'change'>;
}
