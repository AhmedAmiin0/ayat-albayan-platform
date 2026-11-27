import { teacherLessonRoutes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { TeacherLessonCalls } from './teacher-calls.types';

/** Her own cancel and attendance confirm; each answers the lesson view, parsed strictly. */
export function teacherLessonCalls(client: ApiClient): TeacherLessonCalls {
  const call = callWith(client);
  return {
    cancel: (params, body) => call({ route: teacherLessonRoutes.cancel, params, body }),
    confirm: (params) => call({ route: teacherLessonRoutes.confirm, params }),
  };
}
