import { studentRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { StudentCalls } from './students-api.types';

/** Staff students (R-STU-01..05) on one api client, paths and answers from the routes. */
export function studentCalls(client: ApiClient): StudentCalls {
  const call = callWith(client);
  return {
    list: (query, signal) => call({ route: studentRoutes.list, query, signal }),
    get: (id) => call({ route: studentRoutes.get, params: { id } }),
    teacherOptions: () => call({ route: studentRoutes.teacherOptions }),
    statusCounts: (query) => call({ route: studentRoutes.statusCounts, query }),
    create: (body) => call({ route: studentRoutes.create, body }),
    update: (id, body) => call({ route: studentRoutes.update, params: { id }, body }),
    merge: ({ keptId, mergedId }) =>
      call({ route: studentRoutes.merge, params: { id: keptId }, body: { merged_id: mergedId } }),
  };
}
