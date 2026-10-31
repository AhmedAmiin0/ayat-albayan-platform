import {
  addDays,
  dateText,
  RIYADH_TZ,
  riyadhToday,
  wallToUtc,
  weekdayOf,
  weekStart,
  type DateFields,
} from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';

// Calendar days for the mobile schedule (R-SCH-01, R-TCH-02): the academy week runs السبت →
// الجمعة on the Riyadh calendar, like the web grid. Dates are local YYYY-MM-DD; pure, unit-tested.

/**
 * Academy-week math and today's Riyadh day, the web grid's own (shared since docs/27 E6). academy
 * day (docs/34 b): the screens page by Riyadh days; the times inside read in the viewer's zone.
 */
export { addDays, riyadhToday, weekdayOf, weekStart };

/** Riyadh midnight of `date` as a UTC instant (wallToUtc; Riyadh keeps UTC+3 all year). */
export function riyadhMidnight(date: string): string {
  return wallToUtc(date, 0, RIYADH_TZ).toISOString();
}

/** GET /lessons `from`/`to` for the week starting `start`: [Saturday 00:00, next Saturday 00:00). */
export function weekWindow(start: string): { from: string; to: string } {
  return { from: riyadhMidnight(start), to: riyadhMidnight(addDays(start, 7)) };
}

/** Noon of `date` in Riyadh: an instant safely inside that day (for useDayLessons). */
export function riyadhNoon(date: string): Date {
  return wallToUtc(date, 12 * 60, RIYADH_TZ);
}

// Labels in the UI language with Western digits (docs/07 §2). The date is a calendar day, so it is
// formatted at UTC noon in UTC: the device's own zone never shifts it.
const DAY: DateFields = { weekday: 'long', day: 'numeric', month: 'long' };
const SHORT: DateFields = { day: 'numeric', month: 'long' };
const calendarText = (date: string, fields: DateFields) =>
  dateText(new Date(`${date}T12:00:00Z`), { tz: 'UTC', locale }, fields);

/** «السبت 3 أكتوبر». Intl puts «، » after the weekday; the app writes it with a space. */
export function dayLabel(date: string): string {
  return calendarText(date, DAY).replace(/[،,]\s*/, ' ');
}

/** «3 أكتوبر – 9 أكتوبر» for the week starting `start`. */
export function weekLabel(start: string): string {
  return t.calendar.range
    .replace('{from}', calendarText(start, SHORT))
    .replace('{to}', calendarText(addDays(start, 6), SHORT));
}
