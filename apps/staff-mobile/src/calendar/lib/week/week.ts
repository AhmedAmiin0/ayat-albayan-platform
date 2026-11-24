import { wallParts } from '@ab/schedule';
import {
  addDays,
  dateText,
  RIYADH_TZ,
  riyadhToday,
  utcOffsetMinutes,
  wallToUtc,
  weekdayOf,
  weekStart,
  type DateFields,
} from '@ab/time';
import { locale } from '@ab/mobile-kit';

// R-SCH-01, R-TCH-02: the week runs Saturday to Friday on the viewer's calendar (docs/34); pure.

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
const calendarText = (date: string, fields: DateFields) =>
  dateText(new Date(`${date}T12:00:00Z`), { tz: 'UTC', locale }, fields);

/** Intl puts a comma after the weekday; the app writes a space. */
export function dayLabel(date: string): string {
  return calendarText(date, DAY).replace(/[،,]\s*/, ' ');
}

/** Moved to the kit because the family's slot picker pages weeks too. */
export { weekLabel } from '@ab/mobile-kit';
