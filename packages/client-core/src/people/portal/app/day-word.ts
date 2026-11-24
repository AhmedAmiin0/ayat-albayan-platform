import { calendarDaysBetween, dateText, localDateIn, type ClockOptions } from '@ab/time';

// «اليوم» / «غدًا» instead of the date on a lesson card (canvas Home, Schedule): which, if either.

export type DayWord = 'today' | 'tomorrow';

const WORD_OF: Readonly<Record<number, DayWord>> = { 0: 'today', 1: 'tomorrow' };

/** `at` is today or tomorrow on `tz`'s calendar; null for any other day. */
export const dayWord = (at: Date, now: Date, tz: string): DayWord | null =>
  WORD_OF[calendarDaysBetween(localDateIn(now, tz), localDateIn(at, tz))] ?? null;

/** A lesson's length in whole minutes. */
export const lessonMinutes = (l: { starts_at: string; ends_at: string }): number =>
  Math.round((Date.parse(l.ends_at) - Date.parse(l.starts_at)) / 60_000);

/** The date tile's weekday: «الأحد» (long) or «أحد» (short, the week strip). */
export type TileWidth = 'long' | 'short';

export interface DayTile {
  weekday: string;
  day: string;
}

/** The date tile: «الأحد» over «16», on `clock`'s zone and language. */
export const dayTile = (
  at: Date,
  clock: Pick<ClockOptions, 'tz' | 'locale'>,
  width: TileWidth = 'long',
): DayTile => ({
  weekday: dateText(at, clock, { weekday: width }),
  day: dateText(at, clock, { day: 'numeric' }),
});
