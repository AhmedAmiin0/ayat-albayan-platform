import { weekdayOfDate } from './calendar.js';
import { localDateIn, offsetMinutesIn, wallToUtc } from './zoned.js';

// Local days as numbers (docs/34 §7; row k3b, formerly the api's availability/zoned-time.ts): a
// «local day» is the UTC-midnight epoch ms of a calendar date in some zone (y/m/d only). Occurrence
// generation, booking, payouts and the `?from&to` windows count in these; the goldens
// (shared time/golden/day-epoch, occurrences.golden) pin every instant to the pre-date-fns code.

export const MINUTE_MS = 60_000;
/** One calendar day between two local days (both UTC midnights): never a DST-length day. */
export const DAY_MS = 24 * 60 * MINUTE_MS;

const isoDay = (day: number): string => new Date(day).toISOString().slice(0, 10);

/** UTC offset of `zone` at `instant`, in ms (Asia/Riyadh → +3h). */
export function offsetMs(instant: number, zone: string): number {
  return offsetMinutesIn(zone, instant) * MINUTE_MS;
}

/** The calendar day containing `instant` in `zone`, as a local day. */
export function dayInZone(instant: number, zone: string): number {
  return Date.parse(localDateIn(instant, zone));
}

/** 0 = الأحد … 6 = السبت (same as the DB / JS getDay) of a local day. */
export function weekdayOfDay(day: number): number {
  return weekdayOfDate(isoDay(day));
}

/**
 * UTC instant (epoch ms) of `minutes` after midnight on local `day` in `zone` (wallToUtc).
 * Non-existent wall times (spring-forward gap) and repeated ones resolve as they always did.
 * `minutes` may be 1440 ("24:00" = next midnight).
 */
export function dayWallToUtc(day: number, minutes: number, zone: string): number {
  return wallToUtc(isoDay(day), minutes, zone).getTime();
}
