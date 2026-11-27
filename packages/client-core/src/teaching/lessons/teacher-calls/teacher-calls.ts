import { teacherLessonRoutes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { TeacherLessonCalls } from './teacher-calls.types';

/** Her own week, cancel and attendance confirm; every answer is parsed strictly. */
export function teacherLessonCalls(client: ApiClient): TeacherLessonCalls {
  const call = callWith(client);
  return {
    lessons: (query) => call({ route: teacherLessonRoutes.lessons, query }),
    cancel: (params, body) => call({ route: teacherLessonRoutes.cancel, params, body }),
    confirm: (params) => call({ route: teacherLessonRoutes.confirm, params }),
  };
}
