import { dateText } from '@ab/shared';
import { locale } from '@/core/lib/i18n/locale';
import { localDay } from '@/core/lib/money/format';
import { t } from '@/core/lib/i18n/i18n';
import { WEEK } from './calendar-grid';

// The calendar's words in the UI language (Western digits, as the rest of the app). Pure.

/** `YYYY-MM` → «نوفمبر 2026» (the academy calendar: the UTC day of a YYYY-MM-DD). */
export function monthTitle(month: string): string {
  return dateText(
    new Date(`${month}-01T12:00:00Z`),
    { tz: 'UTC', locale },
    { month: 'long', year: 'numeric' },
  );
}

/** The day's number in its cell: «2». */
export const dayNumber = (day: string): string => String(Number(day.slice(8, 10)));

/** A cell's spoken name: «الاثنين، 2 نوفمبر». */
export function daySpoken(day: string, column: number): string {
  const key = WEEK[column] ?? 'sat';
  return `${t.datePicker.weekdays[key]}، ${localDay(day)}`;
}
