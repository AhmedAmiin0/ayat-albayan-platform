import { lessonListRoutes as routes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { LessonListCalls } from './list-calls.types';

/** The admin week, day and overview reads; answers parsed strictly. */
export function lessonListCalls(client: ApiClient): LessonListCalls {
  const call = callWith(client);
  return {
    list: (window) => call({ route: routes.list, query: window }),
    day: (day) => call({ route: routes.day, query: day }),
    overview: (window) => call({ route: routes.overview, query: window }),
  };
}
