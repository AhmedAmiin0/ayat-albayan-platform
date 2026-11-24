import { pastRows, picksFromRows, repeatedDays, type LessonRow } from '@ab/client-core';
import { counted } from '@ab/core';
import { pickProgress } from '@ab/schedule';
import { t } from '@ab/mobile-kit';

// A past time keeps next shut because the API refuses or silently skips it; pure.

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

interface ViewAt {
  fixed: boolean;
  tz: string;
  now: Date;
}

/** Every row filled, none repeated or past. */
const isReady = (p: { rows: readonly LessonRow[]; picks: string[]; blocked: number[] }): boolean =>
  p.picks.length > 0 && p.picks.length === p.rows.length && p.blocked.length === 0;

export function rowsView(rows: readonly LessonRow[], { fixed, tz, now }: ViewAt): RowsView {
  const picks = picksFromRows(rows, tz);
  const past = pastRows(rows, { tz, now });
  const repeated = repeatedDays(rows);
  return {
    picks,
    repeated,
    ready: isReady({ rows, picks, blocked: [...repeated, ...past] }),
    heading: headingOf(fixed, rows.length),
    progress: fixed ? pickProgress(t.booking, picks.length, rows.length) : null,
    canAdd: !fixed && rows.length < MAX_ROWS,
    removable: !fixed && rows.length > 1,
  };
}
