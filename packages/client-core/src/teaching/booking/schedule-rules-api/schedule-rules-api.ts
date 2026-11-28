import { scheduleRuleRoutes as routes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { ScheduleRuleCalls } from './schedule-rules-api.types';

/** The weekly rules' admin calls on one api client; answers parsed strictly. */
export function scheduleRuleCalls(client: ApiClient): ScheduleRuleCalls {
  const call = callWith(client);
  return { refresh: () => call({ route: routes.refresh }) };
}
