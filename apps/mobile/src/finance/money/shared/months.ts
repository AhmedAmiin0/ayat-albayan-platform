import { addCalendarDays, addCalendarMonths, dateText } from '@ab/shared';
import { locale } from '@/core/lib/i18n/locale';

// Calendar months (the date-fns facade, docs/34 §7): plain dates, no zone involved.

/** The newest `count` months ending with the one `today` is in, as YYYY-MM, newest first. */
export function recentMonths(today: string, count = 6): string[] {
  return Array.from({ length: count }, (_, i) => addCalendarMonths(today, -i).slice(0, 7));
}

/** GET /payments `from`/`to`: the month's first and last Riyadh day, both inclusive. */
export function monthRange(ym: string): { from: string; to: string } {
  return { from: `${ym}-01`, to: addCalendarDays(addCalendarMonths(ym, 1), -1) };
}

/** «أكتوبر 2026», Western digits. */
export function monthLabel(ym: string): string {
  const fields = { month: 'long', year: 'numeric' } as const;
  return dateText(new Date(`${ym}-15T12:00:00Z`), { tz: 'UTC', locale }, fields);
}
