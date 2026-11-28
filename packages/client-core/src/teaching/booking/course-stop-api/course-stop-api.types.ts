import type { RouteBody, RouteQuery, RouteResult } from '@ab/core';
import type { courseStopRoutes } from '@ab/shared';

type Routes = typeof courseStopRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface CourseStopCalls {
  /** Without `subscriptionId`: the student's current package. */
  preview: (studentId: string, query: RouteQuery<Routes['preview']>) => Answer<'preview'>;
  stop: (studentId: string, body: RouteBody<Routes['stop']>) => Answer<'stop'>;
}
