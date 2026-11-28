import { activityRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { ActivityCalls } from './activity-api.types';

/** The admin activity log (R-NFR-08), on one api client. */
export function activityCalls(client: ApiClient): ActivityCalls {
  const call = callWith(client);
  return {
    list: (query) => call({ route: activityRoutes.list, query }),
  };
}
