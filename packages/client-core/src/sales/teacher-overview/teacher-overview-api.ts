import { salesTeacherOverviewRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { TeacherOverviewCalls } from './teacher-overview-api.types';

/** One teacher's weekly slots and last 30 days for a salesperson, on one api client. */
export function teacherOverviewCalls(client: ApiClient): TeacherOverviewCalls {
  const call = callWith(client);
  return {
    overview: (id) => call({ route: routes.overview, params: { id } }),
  };
}
