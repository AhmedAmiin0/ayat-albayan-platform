import {
  lessonAt,
  type LessonRow,
  nearestFree,
  picksFromRows,
  pickState,
  type PickState,
  repeatedDays,
} from '@ab/client-core';
import type { SlotsResponse } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { farRows } from './row-window';

// Each row's date error and what the slot data says of its time. Pure.

/** The date error of each row: the same weekday as an earlier row, or past one week. */
export function rowErrors(rows: readonly LessonRow[]): Map<number, string> {
  const errors = new Map<number, string>();
  for (const i of farRows(rows)) errors.set(i, t.lessonTimes.farDay);
  for (const i of repeatedDays(rows)) errors.set(i, t.lessonTimes.sameDay);
  return errors;
}

/** The picks the draft keeps: every filled row without a date error. */
export function rowPicks(rows: readonly LessonRow[], tz: string): string[] {
  const errors = rowErrors(rows);
  return picksFromRows(
    rows.filter((_, i) => !errors.has(i)),
    tz,
  );
}

export interface RowCheck {
  at: string;
  state: PickState;
  suggestions: string[];
}

const CLASHING: ReadonlySet<PickState['kind']> = new Set(['busy', 'outside']);

export interface CheckCtx {
  tz: string;
  durationMin: number;
  now: Date;
}

/** The row's instant, its pickState and, when it clashes, the nearest free times that day. */
export function rowCheck(
  row: LessonRow,
  data: SlotsResponse | undefined,
  ctx: CheckCtx,
): RowCheck | null {
  const at = lessonAt(row, ctx.tz);
  if (at === null || data === undefined) return null;
  const { slots } = data;
  const { durationMin, now } = ctx;
  const state = pickState({ at, slots, stepMin: data.step_min, durationMin, now });
  const suggestions = CLASHING.has(state.kind) ? nearestFree({ at, slots, tz: ctx.tz }) : [];
  return { at, state, suggestions };
}
