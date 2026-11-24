import { addCalendarDays, addCalendarMonths, monthText } from '@ab/time';
import { locale } from '@ab/mobile-kit';

// Calendar months (the date-fns facade, docs/34 §7): plain dates, no zone involved.

/** The newest `count` months ending with the one `today` is in, as YYYY-MM, newest first. */
export function recentMonths(today: string, count = 6): string[] {
  return Array.from({ length: count }, (_, i) => addCalendarMonths(today, -i).slice(0, 7));
}

/** GET /payments `from`/`to`: the month's first and last Riyadh day, both inclusive. */
export function monthRange(ym: string): { from: string; to: string } {
  return { from: `${ym}-01`, to: addCalendarDays(addCalendarMonths(ym, 1), -1) };
}

/** Western digits. */
export function monthLabel(ym: string): string {
  return monthText(ym, locale);
}
