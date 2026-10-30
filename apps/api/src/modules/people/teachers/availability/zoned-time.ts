import { localDateIn, offsetMinutesIn, wallToUtc, weekdayOfDate } from '@ab/shared';

// Wall-clock <-> UTC for the API (rule 6, R-SCH-01), on the @ab/shared date-fns facade (docs/34 §6;
// zoned-time.golden.test.ts and occurrences.golden.test.ts pin every instant to the pre-date-fns
// code). A "local day" is the UTC-midnight epoch ms of a calendar date in some zone (y/m/d only).

export const MINUTE = 60_000;
/** One calendar day between two local days (both UTC midnights): never a DST-length day. */
export const DAY = 24 * 60 * MINUTE;

const isoDay = (day: number): string => new Date(day).toISOString().slice(0, 10);

/** UTC offset of `tz` at `instant`, in ms (Asia/Riyadh → +3h). */
export function offsetMs(instant: number, tz: string): number {
  return offsetMinutesIn(tz, instant) * MINUTE;
}

/** Calendar day containing `instant` in `tz`, as a local day. */
export function localDay(instant: number, tz: string): number {
  return Date.parse(localDateIn(instant, tz));
}

/** 0 = الأحد … 6 = السبت (same as the DB / JS getDay) of a local day. */
export function weekdayOf(day: number): number {
  return weekdayOfDate(isoDay(day));
}

/**
 * UTC instant of `minutes` after midnight on local `day` in `tz` (wallToUtc). Non-existent wall
 * times (spring-forward gap) and repeated ones resolve as they always did (the goldens pin both).
 * `minutes` may be 1440 ("24:00" = next midnight).
 */
export function zonedToUtc(day: number, minutes: number, tz: string): number {
  return wallToUtc(isoDay(day), minutes, tz).getTime();
}

/** "HH:MM" or "HH:MM:SS" (Postgres `time`) → minutes after midnight. Accepts "24:00". */
export function toMinutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}
