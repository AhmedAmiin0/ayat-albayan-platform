import { calendarDaysBetween, localDateIn } from '@ab/shared';

// «اليوم» / «غدًا» instead of the date on a lesson card (canvas Home, Schedule): which, if either.

export type DayWord = 'today' | 'tomorrow';

const WORD_OF: Readonly<Record<number, DayWord>> = { 0: 'today', 1: 'tomorrow' };

/** The day «YYYY-MM-DD» is `today` or the day after; null for any other day. */
export const dayWordOf = (day: string, today: string): DayWord | null =>
  WORD_OF[calendarDaysBetween(today, day)] ?? null;

/** `at` is today or tomorrow on `tz`'s calendar; null for any other day. */
export const dayWord = (at: Date, now: Date, tz: string): DayWord | null =>
  dayWordOf(localDateIn(at, tz), localDateIn(now, tz));

/** A lesson's length in whole minutes. */
export const lessonMinutes = (l: { starts_at: string; ends_at: string }): number =>
  Math.round((Date.parse(l.ends_at) - Date.parse(l.starts_at)) / 60_000);
