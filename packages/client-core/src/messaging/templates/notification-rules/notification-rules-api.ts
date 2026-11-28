import { notificationRuleRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { NotificationRuleCalls } from './notification-rules-api.types';

/** The notification catalogue and one row's edit, on one api client (docs/23 §3). */
export function notificationRuleCalls(client: ApiClient): NotificationRuleCalls {
  const call = callWith(client);
  return {
    overview: () => call({ route: notificationRuleRoutes.overview }),
    update: ({ key, body }) => call({ route: notificationRuleRoutes.update, params: { key }, body }),
  };
}
