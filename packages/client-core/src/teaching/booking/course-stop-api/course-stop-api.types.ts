import type { RouteBody, RouteResult } from '@ab/core';
import type { courseStopRoutes } from '@ab/shared';

type Routes = typeof courseStopRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface CourseStopRef {
  studentId: string;
  subscriptionId: string;
}

export interface CourseStopCalls {
  preview: (ref: CourseStopRef) => Answer<'preview'>;
  stop: (studentId: string, body: RouteBody<Routes['stop']>) => Answer<'stop'>;
}
