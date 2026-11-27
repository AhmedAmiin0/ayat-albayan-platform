import { salesCourseRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { SalesCourseCalls } from './sales-course-api.types';

/** The assistant's course of a package she sold, on one api client; answers parsed strictly. */
export function salesCourseCalls(client: ApiClient): SalesCourseCalls {
  const call = callWith(client);
  return {
    view: (studentId) => call({ route: salesCourseRoutes.view, query: { studentId } }),
    check: (body) => call({ route: salesCourseRoutes.check, body }),
    draft: (body) => call({ route: salesCourseRoutes.draft, body }),
    change: (body) => call({ route: salesCourseRoutes.change, body }),
  };
}
