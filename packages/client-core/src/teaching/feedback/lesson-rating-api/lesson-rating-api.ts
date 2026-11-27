import { lessonRatingRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { LessonRatingCalls } from './lesson-rating-api.types';

/** The guardian's rating request from a chat; the answer is parsed strictly. */
export function lessonRatingCalls(client: ApiClient): LessonRatingCalls {
  const call = callWith(client);
  return {
    send: (params, body) => call({ route: lessonRatingRoutes.send, params, body }),
  };
}
