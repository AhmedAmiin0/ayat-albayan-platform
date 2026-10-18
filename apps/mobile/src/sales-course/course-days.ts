import { wallParts, type Conflict, type DayTime } from '@ab/shared';
import { t } from '@/lib/i18n';

// A booked course's weekdays as text (owner 2026-10-18): «تابِع بنفس الأيام» names the previous
// course's days, and the clashes of a prefilled day name the weekday to pick again. Pure.

const weekdays: Record<string, string | undefined> = t.enums.weekday;

export const weekdayName = (weekday: number): string => weekdays[String(weekday)] ?? '';

/** «الأحد الساعة 17:00، الخميس الساعة 18:00»: each day with its time, in the given order. */
export function daysText(days: readonly DayTime[]): string {
  return days
    .map((d) => t.booking.dayAt.replace('{day}', weekdayName(d.weekday)).replace('{time}', d.startTimeLocal))
    .join(t.common.listSeparator);
}

/** «الخميس»: the weekdays (in `tz`) the clashes fall on, each once, in weekday order. */
export function takenDays(conflicts: readonly Pick<Conflict, 'startsAt'>[], tz: string): string {
  const days = [...new Set(conflicts.map((c) => wallParts(c.startsAt, tz).weekday))].sort((a, b) => a - b);
  return days.map(weekdayName).join(t.common.listSeparator);
}
