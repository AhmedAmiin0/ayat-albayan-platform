import { courseCardRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../../core/http';
import type { CourseCardCalls } from './course-card-api.types';

const CARD_ROUTE = { admin: routes.card, sales: routes.salesCard };

/** The course card and extending its schedule on one api client; answers parsed strictly. */
export function courseCardCalls(client: ApiClient): CourseCardCalls {
  const call = callWith(client);
  return {
    card: ({ studentId, tree }) => call({ route: CARD_ROUTE[tree], params: { id: studentId } }),
    extendPreview: ({ studentId, subscriptionId }) =>
      call({ route: routes.extendPreview, params: { id: studentId }, query: { subscriptionId } }),
    extend: ({ studentId, subscriptionId }) =>
      call({ route: routes.extend, params: { id: studentId }, body: { subscriptionId } }),
  };
}
