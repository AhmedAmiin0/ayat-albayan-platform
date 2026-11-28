import type { RouteResult } from '@ab/core';
import type { scheduleRuleRoutes } from '@ab/schedule';

export interface ScheduleRuleCalls {
  refresh: () => Promise<RouteResult<typeof scheduleRuleRoutes.refresh>>;
}
