import { WEEKDAYS, type AvailabilitySlot, type Weekday } from '@ab/shared';

/** Weekly availability editor model (R-TCH-02): weekday → wall-clock "HH:MM" ranges. */
export type Range = { start: string; end: string };
export type Grid = Record<Weekday, Range[]>;
export type DayProblem = 'endBeforeStart' | 'overlap' | null;

const DEFAULT_START = '16:00';
const LAST_MINUTE = 23 * 60 + 59;

/** Rows of the editor: السبت → الجمعة (docs/07 §8). */
export const WEEK_ORDER: readonly Weekday[] = [6, 0, 1, 2, 3, 4, 5];

export function emptyGrid(): Grid {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

const byStart = (a: Range, b: Range) => a.start.localeCompare(b.start);

export function gridFromRows(rows: readonly AvailabilitySlot[]): Grid {
  const grid = emptyGrid();
  for (const row of rows) {
    const day = WEEKDAYS.find((d) => d === row.weekday);
    if (day !== undefined) grid[day].push({ start: row.start_time, end: row.end_time });
  }
  for (const day of WEEKDAYS) grid[day].sort(byStart);
  return grid;
}

/** PUT /teachers/:id/availability payload; every slot carries the grid's tz (rule 6). */
export function gridToSlots(grid: Grid, tz: string): AvailabilitySlot[] {
  return WEEKDAYS.flatMap((weekday) =>
    grid[weekday].map((r) => ({ weekday, start_time: r.start, end_time: r.end, tz })),
  );
}

/** Rows keep the tz they were entered in; a new grid uses the teacher's tz. */
export function gridTz(rows: readonly AvailabilitySlot[], teacherTz: string): string {
  return rows[0]?.tz ?? teacherTz;
}

export const toMin = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const toTime = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Appends a one-hour range right after the day's last one (16:00 on an empty day). */
export function addRange(ranges: readonly Range[]): Range[] {
  const last = ranges.at(-1);
  const start = Math.min(last ? toMin(last.end) : toMin(DEFAULT_START), LAST_MINUTE - 1);
  return [...ranges, { start: toTime(start), end: toTime(Math.min(start + 60, LAST_MINUTE)) }];
}

export function updateRange(ranges: readonly Range[], index: number, patch: Partial<Range>): Range[] {
  return ranges.map((r, i) => (i === index ? { ...r, ...patch } : r));
}

export function removeRange(ranges: readonly Range[], index: number): Range[] {
  return ranges.filter((_, i) => i !== index);
}

/** First problem of a day: an empty/inverted range, else two ranges overlapping. */
export function dayProblem(ranges: readonly Range[]): DayProblem {
  if (ranges.some((r) => !r.start || !r.end || r.start >= r.end)) return 'endBeforeStart';
  const sorted = ranges.toSorted(byStart);
  return sorted.some((r, i) => i > 0 && r.start < (sorted[i - 1]?.end ?? '')) ? 'overlap' : null;
}

export function gridIsValid(grid: Grid): boolean {
  return WEEKDAYS.every((day) => dayProblem(grid[day]) === null);
}

/** Time select options: 30-minute steps plus the day's last minute; an off-grid value is kept. */
export function timeOptions(current: string): string[] {
  const all = [...Array.from({ length: 48 }, (_, i) => toTime(i * 30)), toTime(LAST_MINUTE)];
  return !current || all.includes(current) ? all : [...all, current].sort();
}

/** Range the day's problem points at: the inverted one, else the later of an overlap; -1 if none. */
export function problemIndex(ranges: readonly Range[]): number {
  const inverted = ranges.findIndex((r) => !r.start || !r.end || r.start >= r.end);
  if (inverted >= 0) return inverted;
  const order = ranges.map((range, index) => ({ range, index })).sort((a, b) => byStart(a.range, b.range));
  const clash = order.find((o, k) => k > 0 && o.range.start < (order[k - 1]?.range.end ?? ''));
  return clash?.index ?? -1;
}
