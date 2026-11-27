import { lessonMoveRoutes as routes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { LessonMoveCalls } from './move-calls.types';

/** Reschedule and in-place time edit of one lesson; answers parsed strictly. */
export function lessonMoveCalls(client: ApiClient): LessonMoveCalls {
  const call = callWith(client);
  return {
    reschedule: (params, body) => call({ route: routes.reschedule, params, body }),
    editTime: (params, body) => call({ route: routes.editTime, params, body }),
  };
}
