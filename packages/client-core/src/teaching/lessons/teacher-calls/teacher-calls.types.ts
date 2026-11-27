import type { RouteBody, RouteParams, RouteResult } from '@ab/core';
import type { teacherLessonRoutes } from '@ab/schedule';

type Routes = typeof teacherLessonRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;
type Lesson = RouteParams<Routes['confirm']>;

/** A teacher's writes on her own lesson; the app keeps its own query keys. */
export interface TeacherLessonCalls {
  cancel: (lesson: Lesson, body: RouteBody<Routes['cancel']>) => Answer<'cancel'>;
  confirm: (lesson: Lesson) => Answer<'confirm'>;
}
