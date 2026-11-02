import { addDays, DAY_MS, dayInZone, dayWallToUtc } from '@ab/shared';
import type { UtcWindow } from './occurrences';

const WEEK = 7 * DAY_MS;

/** "YYYY-MM-DD" → the local-day number of @ab/time's day-epoch (that date's UTC-midnight ms). */
export const dayOf = (date: string): number => Date.parse(`${date}T00:00:00Z`);
const dateOf = (day: number): string => new Date(day).toISOString().slice(0, 10);

/** Calendar date of `instant` in `tz`, "YYYY-MM-DD". */
export const localDateOf = (instant: Date, tz: string): string =>
  dateOf(dayInZone(instant.getTime(), tz));

/** Re-exported for the scheduling callers; the one engine lives in @ab/shared (docs/32 k2). */
export { addDays };

/** UTC instant of local midnight at the start of `date` in `tz` (DST-safe). */
export const startOfLocalDay = (date: string, tz: string): Date =>
  new Date(dayWallToUtc(dayOf(date), 0, tz));

export type HorizonInput = { now: Date; startsOn: string; tz: string; weeks: number };

/**
 * Rolling booking horizon (R-SCH-02, docs/10 §3): from = max(now, local midnight of startsOn),
 * to = now + weeks. A rule starting beyond the horizon gets an inverted (empty) window, so it
 * generates nothing until the daily refresh reaches it.
 */
export function horizonWindow(h: HorizonInput): UtcWindow {
  const start = startOfLocalDay(h.startsOn, h.tz);
  return {
    from: start > h.now ? start : h.now,
    to: new Date(h.now.getTime() + h.weeks * WEEK),
  };
}
