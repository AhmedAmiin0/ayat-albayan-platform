import { ACADEMY_TZ, wallParts, weekdayOf } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const weekday: Record<string, string | undefined> = t.enums.weekday;

/** Null unless the viewer's day differs from the academy's Riyadh day (docs/34 b). */
export function otherDayNote(iso: string, tz: string): string | null {
  const date = wallParts(iso, tz).date;
  if (date === wallParts(iso, ACADEMY_TZ).date) return null;
  const day = weekday[String(weekdayOf(date))];
  return day ? t.sales.academySchedule.otherDay.replace('{day}', day) : null;
}
