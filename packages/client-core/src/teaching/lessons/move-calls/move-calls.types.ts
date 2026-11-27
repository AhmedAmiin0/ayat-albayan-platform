import type { RouteBody, RouteParams, RouteResult } from '@ab/core';
import type { lessonMoveRoutes } from '@ab/schedule';

type Routes = typeof lessonMoveRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;
type Lesson = RouteParams<Routes['reschedule']>;

/** Admin moves of one lesson; the app keeps its own query keys. */
export interface LessonMoveCalls {
  reschedule: (lesson: Lesson, body: RouteBody<Routes['reschedule']>) => Answer<'reschedule'>;
  editTime: (lesson: Lesson, body: RouteBody<Routes['editTime']>) => Answer<'editTime'>;
}
