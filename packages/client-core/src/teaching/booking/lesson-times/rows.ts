import { addCalendarDays, wallInstant, wallParts, weekdayOfDate } from '@ab/shared';

// A weekly course picked as one date + one time per lesson day (owner 2026-11-07: «date input
// and a time input»), shared by web and mobile. A row's date is the first lesson on that
// weekday, its time the student's wall clock (CLAUDE.md rule 6: picked, never typed); together
// they are the same UTC instants the slot grid used to give, so the booking body, the series
// check and togglePick's one-week rule are unchanged. Pure.

/** One lesson day: «YYYY-MM-DD» and «HH:MM» in the student's zone; '' while not picked yet. */
export interface LessonRow {
  date: string;
  time: string;
}

/** The days a row's date may take: the course's first day and the six after it (one week). */
export interface DayBounds {
  min: string;
  max: string;
}

const EMPTY_ROW: LessonRow = { date: '', time: '' };
const isFilled = (row: LessonRow): boolean => row.date !== '' && row.time !== '';

/** The row's instant (ISO, UTC) in `tz`, or null while its date or time is missing. */
export function lessonAt(row: LessonRow, tz: string): string | null {
  return isFilled(row) ? wallInstant(row.date, row.time, tz).toISOString() : null;
}

/** The picks a wizard keeps: every filled row's instant, earliest first. */
export function picksFromRows(rows: readonly LessonRow[], tz: string): string[] {
  return rows
    .map((row) => lessonAt(row, tz))
    .filter((at): at is string => at !== null)
    .sort((a, b) => Date.parse(a) - Date.parse(b));
}

/** Rows for existing picks (a prefilled course), padded with empty rows up to `need`. */
export function rowsFromPicks(picks: readonly string[], tz: string, need: number): LessonRow[] {
  const sorted = [...picks].sort((a, b) => Date.parse(a) - Date.parse(b));
  const rows = sorted.map((at) => {
    const wall = wallParts(at, tz);
    return { date: wall.date, time: wall.time };
  });
  const missing = Math.max(need - rows.length, 0);
  return [...rows, ...Array.from({ length: missing }, () => ({ ...EMPTY_ROW }))];
}

/**
 * The date bounds: from the course's first day `opens` up to six days on, stretched to keep a
 * prefilled date already later than that (a course change rolled a week on).
 */
export function weekBounds(opens: string, rows: readonly LessonRow[] = []): DayBounds {
  const latest = rows.map((r) => r.date).filter((d) => d !== '');
  const max = [addCalendarDays(opens, 6), ...latest].sort().at(-1) ?? opens;
  return { min: opens, max };
}

/** Indexes of rows whose weekday an earlier row already has (each weekday once a week). */
export function repeatedDays(rows: readonly LessonRow[]): number[] {
  const weekdays = rows.map((r) => (r.date === '' ? null : weekdayOfDate(r.date)));
  return weekdays
    .map((day, i) => (day !== null && weekdays.indexOf(day) < i ? i : -1))
    .filter((i) => i >= 0);
}

/** The rows with row `index` patched. */
export function patchRow(
  rows: readonly LessonRow[],
  index: number,
  patch: Partial<LessonRow>,
): LessonRow[] {
  return rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
}
