import { lessonJoinRoutes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { LessonJoinCalls } from './join-calls.types';

/** A lesson's staff room and family link on the signed-in api client; answers parsed strictly. */
export function lessonJoinCalls(client: ApiClient): LessonJoinCalls {
  const call = callWith(client);
  return {
    join: (id) => call({ route: lessonJoinRoutes.join, params: { id } }),
    sendLink: ({ lessonId, studentId }) =>
      call({ route: lessonJoinRoutes.sendLink, params: { id: lessonId }, body: { studentId } }),
    linkUrl: (id) => call({ route: lessonJoinRoutes.linkUrl, params: { id } }),
    staffLessonOf: (token) => call({ route: lessonJoinRoutes.staffLessonOf, params: { token } }),
  };
}
