import type { RouteBody, RouteParams, RouteResult } from '@ab/core';
import type { lessonActionRoutes } from '@ab/schedule';

type Routes = typeof lessonActionRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;
type Lesson = RouteParams<Routes['confirm']>;

/** Staff writes on one lesson; the app keeps its own query keys. */
export interface LessonActionCalls {
  confirm: (lesson: Lesson) => Answer<'confirm'>;
  status: (lesson: Lesson, body: RouteBody<Routes['status']>) => Answer<'status'>;
  cancel: (lesson: Lesson, body: RouteBody<Routes['cancel']>) => Answer<'cancel'>;
  correct: (lesson: Lesson, body: RouteBody<Routes['correct']>) => Answer<'correct'>;
}
