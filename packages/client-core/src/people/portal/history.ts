import type {
  PortalHistory,
  PortalHistoryRow,
  PortalHistoryStatus,
  PortalOutcome,
} from '@ab/shared';
import { localDateIn } from '@ab/time';

// Past lessons by month on the family's clock; an excused absence counts as absent (docs/50 §5.1).

/** Which list a past lesson's outcome belongs to. */
const HISTORY_LIST_OF: Readonly<Record<PortalOutcome, PortalHistoryStatus>> = {
  attended: 'attended',
  absent: 'absent',
  excused: 'absent',
};

const isFirst = (seen: Set<string>, id: string): boolean => !seen.has(id) && Boolean(seen.add(id));

/**
 * The list's loaded rows, newest first, once each (a page boundary may repeat a lesson), and only
 * the outcomes that belong to it.
 */
export function historyRows(
  pages: readonly PortalHistory[] | undefined,
  list: PortalHistoryStatus,
): PortalHistoryRow[] {
  const seen = new Set<string>();
  return (pages ?? [])
    .flatMap((page) => page.rows)
    .filter((row) => HISTORY_LIST_OF[row.outcome] === list && isFirst(seen, row.lesson_id));
}

export interface HistoryMonth {
  /** «YYYY-MM» on the family's clock; the app writes the month's name. */
  month: string;
  rows: PortalHistoryRow[];
}

/** Rows under their month («YYYY-MM» of `at(row)` on `tz`), in the order they came. */
export function monthsOf<T>(
  rows: readonly T[],
  at: (row: T) => string,
  tz: string,
): { month: string; rows: T[] }[] {
  const months = new Map<string, T[]>();
  for (const row of rows) {
    const month = localDateIn(new Date(at(row)), tz).slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), row]);
  }
  return [...months].map(([month, list]) => ({ month, rows: list }));
}

/** The rows under their month (on `tz`), in the order they came (newest first). */
export const historyMonths = (rows: readonly PortalHistoryRow[], tz: string): HistoryMonth[] =>
  monthsOf(rows, (row) => row.starts_at, tz);
