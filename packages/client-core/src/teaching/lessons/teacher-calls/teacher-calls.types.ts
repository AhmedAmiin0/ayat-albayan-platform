import type { RouteBody, RouteParams, RouteQuery, RouteResult } from '@ab/core';
import type { teacherLessonRoutes } from '@ab/schedule';

type Routes = typeof teacherLessonRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;
type Lesson = RouteParams<Routes['confirm']>;

/** A teacher's reads and writes on her own lessons; the app keeps its own query keys. */
export interface TeacherLessonCalls {
  lessons: (window: RouteQuery<Routes['lessons']>) => Answer<'lessons'>;
  cancel: (lesson: Lesson, body: RouteBody<Routes['cancel']>) => Answer<'cancel'>;
  confirm: (lesson: Lesson) => Answer<'confirm'>;
}
