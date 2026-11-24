import { NOTIFICATION_AUDIENCES, type NotificationAudience, type NotificationEntryView } from '@ab/shared';
import { rowsOf } from '@/features/messaging/notification-catalogue/catalogue-tabs';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export interface AudienceCount {
  audience: NotificationAudience;
  label: string;
  on: number;
  off: number;
}

/** Manual rows are not counted; a row reaching two audiences counts under each. */
export function audienceCounts(entries: readonly NotificationEntryView[]): AudienceCount[] {
  return NOTIFICATION_AUDIENCES.map((audience) => {
    const rows = rowsOf(entries, audience);
    const on = rows.filter((e) => e.state === 'on').length;
    return { audience, label: t.notificationCatalogue.audience[audience], on, off: rows.length - on };
  });
}
