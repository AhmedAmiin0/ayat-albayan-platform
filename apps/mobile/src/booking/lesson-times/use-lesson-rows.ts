import { patchRow, picksFromRows, rowsFromPicks, type LessonRow } from '@ab/client-core';
import { useState } from 'react';
import type { SlotMulti } from '@/booking/trial/components/SlotStep';

interface LessonRows {
  rows: LessonRow[];
  /** The plan fixes the days a week (the course): no row is added or removed. */
  fixed: boolean;
  change: (index: number, patch: Partial<LessonRow>) => void;
  add: () => void;
  remove: (index: number) => void;
}

const EMPTY: LessonRow = { date: '', time: '' };

/**
 * The step's rows (one date + one time per day) and the picks they make: every edit hands the
 * wizard the filled rows' instants (picksFromRows). A course (`need` > 0) keeps exactly that many
 * rows; otherwise `start` rows to begin with, then added or removed freely.
 */
export function useLessonRows(multi: SlotMulti, tz: string, start: number): LessonRows {
  const need = multi.need ?? 0;
  const fixed = need > 0;
  const [rows, setRows] = useState(() => rowsFromPicks(multi.picks, tz, fixed ? need : start));
  const set = (next: LessonRow[]) => {
    setRows(next);
    multi.onChange(picksFromRows(next, tz));
  };
  return {
    rows,
    fixed,
    change: (index, patch) => set(patchRow(rows, index, patch)),
    add: () => set([...rows, { ...EMPTY }]),
    remove: (index) => set(rows.filter((_, i) => i !== index)),
  };
}
