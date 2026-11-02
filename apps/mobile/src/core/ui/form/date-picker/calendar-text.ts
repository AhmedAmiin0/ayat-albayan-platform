import { dateText, weekdayOfDate } from '@ab/shared';
import { locale } from '@/core/lib/i18n/locale';
import { localDay } from '@/core/lib/money/format';
import { t } from '@/core/lib/i18n/i18n';

// The calendar's words in the UI language (Western digits, as the rest of the app). Pure.

const weekdays: Record<string, string | undefined> = t.enums.weekday;

/** `YYYY-MM` → «نوفمبر 2026» (the academy calendar: the UTC day of a YYYY-MM-DD). */
export function monthTitle(month: string): string {
  const at = new Date(`${month}-01T12:00:00Z`);
  return dateText(at, { tz: 'UTC', locale }, { month: 'long', year: 'numeric' });
}

/** The day's number in its cell: «2». */
export const dayNumber = (day: string): string => String(Number(day.slice(8, 10)));

/** A cell's spoken name: «الاثنين، 2 نوفمبر 2026», then «، اليوم» on the academy's today. */
export function daySpoken(day: string, today: boolean): string {
  const name = `${weekdays[String(weekdayOfDate(day))] ?? ''}، ${localDay(day)}`;
  return today ? `${name}، ${t.mobile.today}` : name;
}
