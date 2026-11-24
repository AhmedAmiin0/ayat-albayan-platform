import { NOTIFICATION_AUDIENCES, type AudienceTab, type NotificationEntryView } from '@ab/shared';
import { t } from '@ab/mobile-kit';

// docs/26b §6 1.10: one audience at a time, in the web's order, manual rows last when any.

/** The rows of one pill: an audience's automatic/event rows, or every manual row. */
export function rowsOf(entries: readonly NotificationEntryView[], tab: AudienceTab): NotificationEntryView[] {
  if (tab === 'manual') return entries.filter((e) => e.manual);
  return entries.filter((e) => !e.manual && e.audience === tab);
}

/** The manual pill shows only when manual rows exist; guardian is first and the default. */
export function audienceTabs(entries: readonly NotificationEntryView[]): { value: AudienceTab; label: string; count: number }[] {
  const c = t.notificationCatalogue;
  const tabs = NOTIFICATION_AUDIENCES.map((value) => ({ value, label: c.audience[value], count: rowsOf(entries, value).length }));
  const manual = rowsOf(entries, 'manual').length;
  return manual > 0 ? [...tabs, { value: 'manual' as const, label: c.states.manual, count: manual }] : tabs;
}
