import { salesLessonActionRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { SalesLessonActionCalls } from './lesson-actions-api.types';

/** A salesperson's move, cancel, confirm and correct of one lesson, on one api client. */
export function salesLessonActionCalls(client: ApiClient): SalesLessonActionCalls {
  const call = callWith(client);
  return {
    reschedule: ({ lessonId, body }) =>
      call({ route: salesLessonActionRoutes.reschedule, params: { id: lessonId }, body }),
    cancel: ({ lessonId, body }) =>
      call({ route: salesLessonActionRoutes.cancel, params: { id: lessonId }, body }),
    confirm: (lessonId) =>
      call({ route: salesLessonActionRoutes.confirm, params: { id: lessonId } }),
    correct: ({ lessonId, body }) =>
      call({ route: salesLessonActionRoutes.correct, params: { id: lessonId }, body }),
  };
}
