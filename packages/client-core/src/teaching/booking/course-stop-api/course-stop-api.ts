import { courseStopRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { CourseStopCalls } from './course-stop-api.types';

/** The stop sheet's preview and the stop on one api client; answers parsed strictly. */
export function courseStopCalls(client: ApiClient): CourseStopCalls {
  const call = callWith(client);
  return {
    preview: ({ studentId, subscriptionId }) =>
      call({ route: routes.preview, params: { id: studentId }, query: { subscriptionId } }),
    stop: (studentId, body) => call({ route: routes.stop, params: { id: studentId }, body }),
  };
}
