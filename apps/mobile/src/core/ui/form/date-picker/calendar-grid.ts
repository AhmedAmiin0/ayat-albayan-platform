import { addCalendarDays, addCalendarMonths, weekdayOfDate } from '@ab/shared';

// The in-app calendar's month grid (no native date picker: the app updates over the air). Pure:
// days are academy (Riyadh) calendar days, `YYYY-MM-DD`, compared as strings; no Date or zone.

/** The allowed days, inclusive; no `max` = open-ended. */
export interface DayRange {
  min: string;
  max?: string | undefined;
}

/** One week row: a day of the month, or null for the blanks before the 1st and after the last. */
type GridWeek = (string | null)[];

/** The grid's columns, السبت first (the keys of t.datePicker.weekdaysShort). */
export const WEEK = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;

/** The week starts on السبت (weekdayOfDate 6): its column index is (weekday + 1) % 7. */
const column = (day: string): number => (weekdayOfDate(day) + 1) % 7;

const isAfterMax = (day: string, range: DayRange): boolean =>
  range.max !== undefined && day > range.max;

/** A day the picker lets the user choose. */
export const dayAllowed = (day: string, range: DayRange): boolean =>
  day >= range.min && !isAfterMax(day, range);

/** `YYYY-MM` of a day. */
export const monthOf = (day: string): string => day.slice(0, 7);

/** `2026-12` + 1 → `2027-01`. */
export const shiftMonth = (month: string, delta: number): string =>
  addCalendarMonths(month, delta).slice(0, 7);

/** The days of a month, `YYYY-MM-01` to its last day. */
function daysOf(month: string): string[] {
  const first = `${month}-01`;
  const next = addCalendarMonths(month, 1);
  const days: string[] = [];
  for (let day = first; day < next; day = addCalendarDays(day, 1)) days.push(day);
  return days;
}

/** The month as week rows of 7 (Saturday first), blank cells padded to whole weeks. */
export function monthGrid(month: string): GridWeek[] {
  const days = daysOf(month);
  const lead: null[] = Array.from({ length: column(`${month}-01`) }, () => null);
  const cells: (string | null)[] = [...lead, ...days];
  const tail: null[] = Array.from({ length: (7 - (cells.length % 7)) % 7 }, () => null);
  const all = [...cells, ...tail];
  return Array.from({ length: all.length / 7 }, (_, w) => all.slice(w * 7, w * 7 + 7));
}

/** Whether the month `delta` away still holds an allowed day (the arrows stop at the range). */
export function canShift(month: string, delta: -1 | 1, range: DayRange): boolean {
  const target = shiftMonth(month, delta);
  return delta < 0
    ? target >= monthOf(range.min)
    : range.max === undefined || target <= monthOf(range.max);
}

/** The month the calendar opens on: the picked day's, or the nearest allowed one's. */
export function openingMonth(day: string, range: DayRange): string {
  const clamped = day < range.min ? range.min : day;
  return monthOf(range.max !== undefined && clamped > range.max ? range.max : clamped);
}
