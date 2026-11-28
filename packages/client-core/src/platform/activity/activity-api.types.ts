import type { ActivityListQueryInput, ActivityPage } from '@ab/shared';

export interface ActivityCalls {
  list: (query: ActivityListQueryInput) => Promise<ActivityPage>;
}
