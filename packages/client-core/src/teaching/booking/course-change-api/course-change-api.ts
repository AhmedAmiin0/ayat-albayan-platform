import { courseChangeRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { CourseChangeCalls } from './course-change-api.types';

/** The admin's course change on one api client; answers parsed strictly. */
export function courseChangeCalls(client: ApiClient): CourseChangeCalls {
  const call = callWith(client);
  return {
    view: (subscriptionId) => call({ route: routes.view, query: { subscriptionId } }),
    check: (body) => call({ route: routes.check, body }),
    change: (body) => call({ route: routes.change, body }),
  };
}
