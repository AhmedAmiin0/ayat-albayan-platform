import { courseTeacherRoutes, courseTimesRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { CourseTeacherCalls, CourseTimesCalls } from './course-move-api.types';

/** The profile's change of a course's days and times; answers parsed strictly. */
export function courseTimesCalls(client: ApiClient): CourseTimesCalls {
  const call = callWith(client);
  return {
    view: (id, query) => call({ route: courseTimesRoutes.view, params: { id }, query }),
    check: (id, body) => call({ route: courseTimesRoutes.check, params: { id }, body }),
    change: (id, body) => call({ route: courseTimesRoutes.change, params: { id }, body }),
  };
}

/** The profile's move of a course to a new teacher; answers parsed strictly. */
export function courseTeacherCalls(client: ApiClient): CourseTeacherCalls {
  const call = callWith(client);
  return {
    view: (id, query) => call({ route: courseTeacherRoutes.view, params: { id }, query }),
    check: (id, body) => call({ route: courseTeacherRoutes.check, params: { id }, body }),
    change: (id, body) => call({ route: courseTeacherRoutes.change, params: { id }, body }),
    teachers: (id) => call({ route: courseTeacherRoutes.teachers, params: { id } }),
  };
}
