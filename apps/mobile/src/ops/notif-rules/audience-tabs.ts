import { NOTIFICATION_AUDIENCES, type NotificationAudience, type NotificationEntryView } from '@ab/shared';
import { t } from '@/lib/i18n';

// «الإشعارات» one audience at a time on the phone (docs/26b §6 1.10), in the web's order:
// ولي الأمر · المعلم/ة · العميل · فريق الأكاديمية, then «يدوي» (the messages a person sends) when any.

export type AudienceTab = NotificationAudience | 'manual';

/** The rows of one pill: an audience's automatic/event rows, or every manual row. */
export function rowsOf(entries: readonly NotificationEntryView[], tab: AudienceTab): NotificationEntryView[] {
  if (tab === 'manual') return entries.filter((e) => e.manual);
  return entries.filter((e) => !e.manual && e.audience === tab);
}

/** The pills with their counts; «يدوي» only when the catalogue has manual rows. Guardian first (the default). */
export function audienceTabs(entries: readonly NotificationEntryView[]): { value: AudienceTab; label: string; count: number }[] {
  const c = t.notificationCatalogue;
  const tabs = NOTIFICATION_AUDIENCES.map((value) => ({ value, label: c.audience[value], count: rowsOf(entries, value).length }));
  const manual = rowsOf(entries, 'manual').length;
  return manual > 0 ? [...tabs, { value: 'manual' as const, label: c.states.manual, count: manual }] : tabs;
}
