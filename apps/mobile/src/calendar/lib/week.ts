import { addDays, intlLocale, riyadhToday, weekdayOf, weekStart } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';

// Calendar days for the mobile schedule (R-SCH-01, R-TCH-02): the academy week runs السبت →
// الجمعة on the Riyadh calendar, like the web grid. Dates are local YYYY-MM-DD; pure, unit-tested.

/** Academy-week math and today's Riyadh day, the web grid's own (shared since docs/27 E6). */
export { addDays, riyadhToday, weekdayOf, weekStart };

/**
 * Riyadh midnight of `date` as a UTC instant. ponytail: Riyadh keeps UTC+3 all year (no DST), so
 * the fixed offset is exact; a zone with DST would need utcOffsetMinutes.
 */
export function riyadhMidnight(date: string): string {
  return new Date(`${date}T00:00:00+03:00`).toISOString();
}

/** GET /lessons `from`/`to` for the week starting `start`: [Saturday 00:00, next Saturday 00:00). */
export function weekWindow(start: string): { from: string; to: string } {
  return { from: riyadhMidnight(start), to: riyadhMidnight(addDays(start, 7)) };
}

/** Noon of `date` in Riyadh: an instant safely inside that day (for useDayLessons). */
export function riyadhNoon(date: string): Date {
  return new Date(`${date}T12:00:00+03:00`);
}

// Labels in the UI language with Western digits (docs/07 §2). The date is a calendar day, so it is
// formatted at UTC noon with timeZone UTC: the device's own zone never shifts it.
const dayFormat = new Intl.DateTimeFormat(intlLocale(locale), {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});
const shortFormat = new Intl.DateTimeFormat(intlLocale(locale), {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});
const atNoon = (date: string) => new Date(`${date}T12:00:00Z`);

/** «السبت 3 أكتوبر». Intl puts «، » after the weekday; the app writes it with a space. */
export function dayLabel(date: string): string {
  return dayFormat.format(atNoon(date)).replace(/[،,]\s*/, ' ');
}

/** «3 أكتوبر – 9 أكتوبر» for the week starting `start`. */
export function weekLabel(start: string): string {
  return t.calendar.range
    .replace('{from}', shortFormat.format(atNoon(start)))
    .replace('{to}', shortFormat.format(atNoon(addDays(start, 6))));
}
