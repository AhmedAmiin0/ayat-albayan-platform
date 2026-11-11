import { addDays, BOARD_DAYS, localDateIn, startOfLocalDay } from '@ab/shared';

/**
 * The board window in her zone (docs/46 D4): [today − 14 days, today + 14 days) as local midnights,
 * one GET /teachers/me/lessons (28 days, under the API's 31-day cap). Stable all day, so the query
 * key (and the saved cache) changes only at midnight.
 */
export function boardWindow(now: Date, tz: string): { from: string; to: string } {
  const today = localDateIn(now, tz);
  const at = (days: number) => startOfLocalDay(addDays(today, days), tz).toISOString();
  return { from: at(-BOARD_DAYS), to: at(BOARD_DAYS) };
}
