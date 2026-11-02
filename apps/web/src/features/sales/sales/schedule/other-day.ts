import { ACADEMY_TZ, wallParts, weekdayOf } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

const weekday: Record<string, string | undefined> = t.enums.weekday;

/**
 * «السبت بتوقيتك» when `iso` falls on another day for the viewer (`tz`) than on the academy's
 * calendar, else null. academy day (docs/34 b): /sales/schedule pages by Riyadh days, so a Cairo
 * viewer's 00:30 Riyadh lesson on «الأحد» is Saturday 23:30 for them.
 */
export function otherDayNote(iso: string, tz: string): string | null {
  const date = wallParts(iso, tz).date;
  if (date === wallParts(iso, ACADEMY_TZ).date) return null;
  const day = weekday[String(weekdayOf(date))];
  return day ? t.sales.academySchedule.otherDay.replace('{day}', day) : null;
}
