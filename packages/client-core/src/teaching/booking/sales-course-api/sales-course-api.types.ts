import type { RouteBody, RouteResult } from '@ab/core';
import type { salesCourseRoutes } from '@ab/shared';

type Routes = typeof salesCourseRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface SalesCourseCalls {
  view: (studentId: string) => Answer<'view'>;
  check: (body: RouteBody<Routes['check']>) => Answer<'check'>;
  draft: (body: RouteBody<Routes['draft']>) => Answer<'draft'>;
  change: (body: RouteBody<Routes['change']>) => Answer<'change'>;
}
