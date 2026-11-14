import { addDays, localDateIn, wallToUtc, weekStart } from '@ab/shared';

// «جدولي» month view (owner 2026-11-14): a Saturday-first grid of whole academy weeks covering one
// calendar month, in the teacher's zone. Plain calendar math on local dates «YYYY-MM-DD».

/** A month «YYYY-MM». */
export type MonthKey = string;

export interface MonthCell {
  date: string;
  /** The date is in the shown month (the edge weeks borrow days from its neighbours). */
  inMonth: boolean;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** The month holding a local date. */
export const monthOf = (date: string): MonthKey => date.slice(0, 7);

/** The month `n` months later (negative: earlier); crosses years. */
export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y = 0, m = 1] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

const firstOf = (month: MonthKey): string => `${month}-01`;
const lastOf = (month: MonthKey): string => addDays(firstOf(addMonths(month, 1)), -1);

/** The first and the day after the last day of the grid: whole weeks, السبت → الجمعة. */
export function monthSpan(month: MonthKey): { first: string; end: string } {
  return { first: weekStart(firstOf(month)), end: addDays(weekStart(lastOf(month)), 7) };
}

/** The grid's weeks, each 7 cells from Saturday; 4 to 6 weeks. */
export function monthGrid(month: MonthKey): MonthCell[][] {
  const { first, end } = monthSpan(month);
  const weeks: MonthCell[][] = [];
  for (let start = first; start < end; start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => cellOf(addDays(start, i), month)));
  }
  return weeks;
}

const cellOf = (date: string, month: MonthKey): MonthCell => ({
  date,
  inMonth: monthOf(date) === month,
});

/** [from, to) instants of the whole grid in `zone`: one lessons query per shown month. */
export function monthWindowIn(month: MonthKey, zone: string): { from: Date; to: Date } {
  const { first, end } = monthSpan(month);
  return { from: wallToUtc(first, 0, zone), to: wallToUtc(end, 0, zone) };
}

/** Lessons bucketed by their local start day in `zone`, in the order given. */
export function lessonsByDay<L extends { starts_at: string }>(
  lessons: readonly L[],
  zone: string,
): Map<string, L[]> {
  const days = new Map<string, L[]>();
  for (const lesson of lessons) {
    const day = localDateIn(new Date(lesson.starts_at), zone);
    days.set(day, [...(days.get(day) ?? []), lesson]);
  }
  return days;
}
