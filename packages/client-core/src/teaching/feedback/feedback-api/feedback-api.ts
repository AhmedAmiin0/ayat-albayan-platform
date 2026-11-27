import { feedbackRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { FeedbackCalls } from './feedback-api.types';

/** Lesson feedback lists and the admin's request on one api client; answers parsed strictly. */
export function feedbackCalls(client: ApiClient): FeedbackCalls {
  const call = callWith(client);
  return {
    list: (query) => call({ route: feedbackRoutes.list, query }),
    summary: () => call({ route: feedbackRoutes.summary }),
    mine: (query = {}) => call({ route: feedbackRoutes.mine, query }),
    request: ({ lessonId, studentId }) =>
      call({ route: feedbackRoutes.request, params: { id: lessonId }, body: { studentId } }),
  };
}
