import { teacherRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { TeacherCalls } from './teachers-api.types';

/** Teachers (R-TCH-01, admin only) on one api client, paths and answers from routes. */
export function teacherCalls(client: ApiClient): TeacherCalls {
  const call = callWith(client);
  return {
    list: (query, signal) => call({ route: teacherRoutes.list, query, signal }),
    get: (id) => call({ route: teacherRoutes.get, params: { id } }),
    create: (body) => call({ route: teacherRoutes.create, body }),
    update: (id, body) => call({ route: teacherRoutes.update, params: { id }, body }),
  };
}
