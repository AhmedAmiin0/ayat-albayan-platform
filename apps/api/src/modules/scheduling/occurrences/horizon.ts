import { DAY, localDay, zonedToUtc } from '../../teachers/availability/zoned-time';
import type { UtcWindow } from './occurrences';

const WEEK = 7 * DAY;

/** "YYYY-MM-DD" → the local-day number zoned-time works with (that date's UTC-midnight ms). */
export const dayOf = (date: string): number => Date.parse(`${date}T00:00:00Z`);
const dateOf = (day: number): string => new Date(day).toISOString().slice(0, 10);

/** Calendar date of `instant` in `tz`, "YYYY-MM-DD". */
export const localDateOf = (instant: Date, tz: string): string =>
  dateOf(localDay(instant.getTime(), tz));

export const addDays = (date: string, days: number): string => dateOf(dayOf(date) + days * DAY);

/** UTC instant of local midnight at the start of `date` in `tz` (DST-safe). */
export const startOfLocalDay = (date: string, tz: string): Date =>
  new Date(zonedToUtc(dayOf(date), 0, tz));

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
