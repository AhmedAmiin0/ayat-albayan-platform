import { NOTIFICATION_AUDIENCES, type NotificationAudience, type NotificationEntryView } from '@ab/shared';
import { rowsOf } from '@/features/notification-catalogue/catalogue-tabs';
import { t } from '@/lib/i18n';

/** One row of «ماذا يُرسل الآن»: an audience and how many of its notifications send now / do not. */
export interface AudienceCount {
  audience: NotificationAudience;
  label: string;
  on: number;
  off: number;
}

/**
 * Counts per audience, in the order and with the names of «الإشعارات»' audience tabs (manual rows,
 * which a person sends, are not counted). «تُرسل الآن» is the row's own effective state from GET
 * /admin/notifications (`state: 'on'`); every other automatic row counts as «لا تُرسل».
 */
export function audienceCounts(entries: readonly NotificationEntryView[]): AudienceCount[] {
  return NOTIFICATION_AUDIENCES.map((audience) => {
    const rows = rowsOf(entries, audience);
    const on = rows.filter((e) => e.state === 'on').length;
    return { audience, label: t.notificationCatalogue.audience[audience], on, off: rows.length - on };
  });
}
