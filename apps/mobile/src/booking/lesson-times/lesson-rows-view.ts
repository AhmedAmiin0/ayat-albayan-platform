import { picksFromRows, repeatedDays, type LessonRow } from '@ab/client-core';
import { counted, pickProgress } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

// What the step shows around its rows: the picks they make, the repeated weekdays, whether
// «التالي» opens, the heading note, the course's progress and whether a day can be added or
// removed (the days a week are not fixed). Pure.

/** Most a weekly package can have: one row per weekday. */
const MAX_ROWS = 7;

interface RowsView {
  picks: string[];
  repeated: number[];
  ready: boolean;
  heading: string;
  progress: string | null;
  canAdd: boolean;
  removable: boolean;
}

const headingOf = (fixed: boolean, count: number): string =>
  fixed ? counted(t.booking.pickNDays, count) : t.booking.pickDayTimes;

export function rowsView(rows: readonly LessonRow[], fixed: boolean, tz: string): RowsView {
  const picks = picksFromRows(rows, tz);
  const repeated = repeatedDays(rows);
  const filled = picks.length > 0 && picks.length === rows.length;
  return {
    picks,
    repeated,
    ready: filled && repeated.length === 0,
    heading: headingOf(fixed, rows.length),
    progress: fixed ? pickProgress(t.booking, picks.length, rows.length) : null,
    canAdd: !fixed && rows.length < MAX_ROWS,
    removable: !fixed && rows.length > 1,
  };
}
