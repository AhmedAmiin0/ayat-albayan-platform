import { teacherLessonRoutes, teacherMeRoutes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { TeacherLessonCalls } from './teacher-calls.types';

/** Her own profile, week, cancel and attendance confirm; every answer is parsed strictly. */
export function teacherLessonCalls(client: ApiClient): TeacherLessonCalls {
  const call = callWith(client);
  return {
    me: () => call({ route: teacherMeRoutes.me }),
    lessons: (query) => call({ route: teacherLessonRoutes.lessons, query }),
    cancel: (params, body) => call({ route: teacherLessonRoutes.cancel, params, body }),
    confirm: (params) => call({ route: teacherLessonRoutes.confirm, params }),
  };
}
