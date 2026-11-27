import { teacherRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { TeacherCalls } from './teachers-api.types';

/** Teachers (R-TCH-01, admin only) on one api client, paths and answers from routes. */
export function teacherCalls(client: ApiClient): TeacherCalls {
  const call = callWith(client);
  return {
    list: (query) => call({ route: routes.list, query }),
    get: (id) => call({ route: routes.get, params: { id } }),
    create: (body) => call({ route: routes.create, body }),
    update: (id, body) => call({ route: routes.update, params: { id }, body }),
  };
}
