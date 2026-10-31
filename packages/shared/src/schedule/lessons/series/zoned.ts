import { addCalendarDays, wallInstant } from '../../../time/index.js';

// Local wall clock → UTC instant in an IANA zone, for prefilled picks (owner 2026-10-18: «تابِع بنفس
// الأيام», «تغيير أيام الحلقات»). Pure; the date-fns facade (time/zoned.ts) does the zone math, by
// the same two-pass rule as the API's zonedToUtc (goldens: time/golden).

/** The ISO instant a wall clock (`date` "YYYY-MM-DD", `time` "HH:MM") happens in `tz`; DST-safe. */
export const zonedInstant = (date: string, time: string, tz: string): string =>
  wallInstant(date, time, tz).toISOString();

/** `date` moved by `days` local days ("YYYY-MM-DD"). */
export const addLocalDays = addCalendarDays;

/** 0 = الأحد … 6 = السبت of a local date (the date-fns facade). */
export { weekdayOfDate } from '../../../time/index.js';
