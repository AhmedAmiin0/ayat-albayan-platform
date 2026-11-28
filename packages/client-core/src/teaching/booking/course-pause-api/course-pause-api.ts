import { coursePauseRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { CoursePauseCalls } from './course-pause-api.types';

/** A student's course pause on one api client; answers parsed strictly. */
export function coursePauseCalls(client: ApiClient): CoursePauseCalls {
  const call = callWith(client);
  const of = (id: string) => ({ id });
  return {
    state: (studentId) => call({ route: routes.state, params: of(studentId) }),
    preview: ({ studentId, from, until }) =>
      call({
        route: routes.preview,
        params: of(studentId),
        query: { from, until: until ?? undefined },
      }),
    resumePreview: (studentId) => call({ route: routes.resumePreview, params: of(studentId) }),
    start: (studentId, body) => call({ route: routes.start, params: of(studentId), body }),
    until: (studentId, untilDate) =>
      call({ route: routes.until, params: of(studentId), body: { untilDate } }),
    resume: (studentId, subscriptionId) =>
      call({ route: routes.resume, params: of(studentId), body: { subscriptionId } }),
  };
}
