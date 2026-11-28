import type { NotificationEntryView, NotificationsOverview, RulePatchInput } from '@ab/shared';

export interface NotificationRuleCalls {
  overview: () => Promise<NotificationsOverview>;
  update: (input: { key: string; body: RulePatchInput }) => Promise<NotificationEntryView>;
}
