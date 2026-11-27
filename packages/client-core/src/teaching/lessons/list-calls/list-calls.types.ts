import type { RouteQuery, RouteResult } from '@ab/core';
import type { lessonListRoutes } from '@ab/schedule';

type Routes = typeof lessonListRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

/** Admin lesson lists across teachers; the app keeps its own query keys. */
export interface LessonListCalls {
  list: (window: RouteQuery<Routes['list']>) => Answer<'list'>;
  day: (day: RouteQuery<Routes['day']>) => Answer<'day'>;
  overview: (window: RouteQuery<Routes['overview']>) => Answer<'overview'>;
}
