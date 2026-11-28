import { lessonRoomRoutes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { LessonRoomCalls } from './room-calls.types';

/** A lesson's room and the student's link on the signed-in api client; answers parsed strictly. */
export function lessonRoomCalls(client: ApiClient): LessonRoomCalls {
  const call = callWith(client);
  return {
    openRoom: (id) => call({ route: lessonRoomRoutes.open, params: { id } }),
    issueStudentLink: (id) => call({ route: lessonRoomRoutes.issueStudentLink, params: { id } }),
  };
}
