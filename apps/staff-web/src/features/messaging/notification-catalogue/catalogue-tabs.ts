import { NOTIFICATION_AUDIENCES, type AudienceTab, type NotificationEntryView } from '@ab/shared';
import { t } from '@ab/web-kit';

// One audience per tab (docs/26b §3); the manual tab appears only when there are manual rows.

/** The rows of one tab: an audience's automatic/event rows, or every manual row. */
export function rowsOf(entries: readonly NotificationEntryView[], tab: AudienceTab): NotificationEntryView[] {
  if (tab === 'manual') return entries.filter((e) => e.manual);
  // A row that also reaches this audience (a schedule change: the teacher) is listed here too.
  return entries.filter((e) => !e.manual && (e.audience === tab || !!e.also_to?.includes(tab)));
}

/** The manual tab only when manual rows exist; guardian first as the default. */
export function audienceTabs(entries: readonly NotificationEntryView[]): { value: AudienceTab; label: string; count: number }[] {
  const c = t.notificationCatalogue;
  const tabs = NOTIFICATION_AUDIENCES.map((value) => ({ value, label: c.audience[value], count: rowsOf(entries, value).length }));
  const manual = rowsOf(entries, 'manual').length;
  return manual > 0 ? [...tabs, { value: 'manual' as const, label: c.states.manual, count: manual }] : tabs;
}
