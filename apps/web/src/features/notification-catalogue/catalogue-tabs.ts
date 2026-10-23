import { NOTIFICATION_AUDIENCES, type NotificationAudience, type NotificationEntryView } from '@ab/shared';
import { t } from '@/lib/i18n';

// «ماذا يُرسل ومتى» one audience at a time (docs/26b §3, mockup notifications.html): ولي الأمر ·
// المعلم/ة · العميل · فريق الأكاديمية, then «يدوي» (the messages a person sends) when there are any.

export type AudienceTab = NotificationAudience | 'manual';

/** The rows of one tab: an audience's automatic/event rows, or every manual row. */
export function rowsOf(entries: readonly NotificationEntryView[], tab: AudienceTab): NotificationEntryView[] {
  if (tab === 'manual') return entries.filter((e) => e.manual);
  return entries.filter((e) => !e.manual && e.audience === tab);
}

/** The tabs with their counts; «يدوي» only when the catalogue has manual rows. Guardian first (the default). */
export function audienceTabs(entries: readonly NotificationEntryView[]): { value: AudienceTab; label: string; count: number }[] {
  const c = t.notificationCatalogue;
  const tabs = NOTIFICATION_AUDIENCES.map((value) => ({ value, label: c.audience[value], count: rowsOf(entries, value).length }));
  const manual = rowsOf(entries, 'manual').length;
  return manual > 0 ? [...tabs, { value: 'manual' as const, label: c.states.manual, count: manual }] : tabs;
}
