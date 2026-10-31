import {
  addDays,
  dateText,
  RIYADH_TZ,
  riyadhToday,
  utcOffsetMinutes,
  wallParts,
  wallToUtc,
  weekdayOf,
  weekStart,
  type DateFields,
} from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';

// Calendar days for the mobile schedule (R-SCH-01, R-TCH-02): the week runs السبت → الجمعة on the
// viewer's calendar (docs/34), like the web grid. Dates are local YYYY-MM-DD; pure, unit-tested.

/**
 * Academy-week math and today's Riyadh day, the web grid's own (shared since docs/27 E6). academy
 * day (docs/34 b): riyadhToday stays for the `?date` endpoints; the calendars page by viewer days.
 */
export { addDays, riyadhToday, weekdayOf, weekStart };

/** Riyadh midnight of `date` as a UTC instant (wallToUtc; Riyadh keeps UTC+3 all year). */
export function riyadhMidnight(date: string): string {
  return wallToUtc(date, 0, RIYADH_TZ).toISOString();
}

/** Today on the viewer's calendar `tz` (useViewerTz), YYYY-MM-DD: the day the calendars open on. */
export const viewerToday = (now: Date, tz: string): string => wallParts(now.toISOString(), tz).date;

const MINUTE = 60_000;

/**
 * Midnight that starts `date` in `tz` (the viewer's) as a UTC instant. DST-correct: the offset is
 * read twice (Cairo's summer time ends on a Friday at 00:00), never a fixed +03:00.
 */
export function zonedMidnight(date: string, tz: string): string {
  const wall = Date.parse(`${date}T00:00:00Z`);
  const guess = wall - utcOffsetMinutes(tz, new Date(wall)) * MINUTE;
  return new Date(wall - utcOffsetMinutes(tz, new Date(guess)) * MINUTE).toISOString();
}

/**
 * GET /lessons(/overview) `from`/`to` for the week starting `start` on the viewer's calendar `tz`:
 * [Saturday 00:00, next Saturday 00:00) there (docs/34: window, day buckets and clock one zone).
 */
export function weekWindow(start: string, tz: string): { from: string; to: string } {
  return { from: zonedMidnight(start, tz), to: zonedMidnight(addDays(start, 7), tz) };
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
