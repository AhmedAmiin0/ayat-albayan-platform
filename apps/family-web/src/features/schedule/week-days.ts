import type { DayWord, WeekDay } from '@ab/client-core';
import { calendarDaysBetween } from '@ab/shared';

const DAY_MS = 86_400_000;
const WEEK = [0, 1, 2, 3, 4, 5, 6] as const;

/** The seven «YYYY-MM-DD» days of the academy week starting `from` (calendar arithmetic, UTC). */
export const weekDates = (from: string): string[] =>
  WEEK.map((i) => new Date(Date.parse(`${from}T12:00:00Z`) + i * DAY_MS).toISOString().slice(0, 10));

const WORD_OF: Readonly<Record<number, DayWord>> = { 0: 'today', 1: 'tomorrow' };

/** «اليوم» / «غدًا» over a day tile, from today's date on the viewer's clock; else null. */
export const dayBadge = (day: string, today: string): DayWord | null =>
  WORD_OF[calendarDaysBetween(today, day)] ?? null;

/** Every day of the week (boards: seven tiles), each with its lessons (none: an empty tile). */
export function weekTiles(from: string, days: readonly WeekDay[]): WeekDay[] {
  const byDay = new Map(days.map((d) => [d.day, d.lessons]));
  return weekDates(from).map((day) => ({ day, lessons: byDay.get(day) ?? [] }));
}
