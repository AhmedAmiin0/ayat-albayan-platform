import type { RouteResult } from '@ab/core';
import type { LessonCorrect } from '@ab/schedule';
import type { SalesCancel, SalesReschedule, salesLessonActionRoutes } from '@ab/shared';

type Answer<K extends keyof typeof salesLessonActionRoutes> = Promise<
  RouteResult<(typeof salesLessonActionRoutes)[K]>
>;

export interface SalesLessonRequest<B> {
  lessonId: string;
  body: B;
}

export interface SalesLessonActionCalls {
  reschedule: (input: SalesLessonRequest<SalesReschedule>) => Answer<'reschedule'>;
  cancel: (input: SalesLessonRequest<SalesCancel>) => Answer<'cancel'>;
  confirm: (lessonId: string) => Answer<'confirm'>;
  correct: (input: SalesLessonRequest<LessonCorrect>) => Answer<'correct'>;
}
