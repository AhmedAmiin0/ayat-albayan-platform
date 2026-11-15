import {
  lessonAt,
  type LessonRow,
  nearestFree,
  partialRows,
  pastRows,
  picksFromRows,
  pickState,
  type PickState,
  repeatedDays,
} from '@ab/client-core';
import type { SlotsResponse } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { farRows } from './row-window';

// Each row's date error and what the slot data says of its time. Pure.

/** Where the rows are read: the family's zone and the wizard's «now». */
export interface RowsAt {
  tz: string;
  now: Date;
}

/** Each row's error: a time already past, a weekday an earlier row has, or past one week. */
export function rowErrors(rows: readonly LessonRow[], at: RowsAt): Map<number, string> {
  const errors = new Map<number, string>();
  for (const i of pastRows(rows, at)) errors.set(i, t.lessonTimes.past);
  for (const i of farRows(rows)) errors.set(i, t.lessonTimes.farDay);
  for (const i of repeatedDays(rows)) errors.set(i, t.lessonTimes.sameDay);
  return errors;
}

/**
 * The picks the draft keeps: none while a row has an error or only half its date / time (so
 * «التالي» stays shut and no day is dropped silently), else every filled row's instant.
 */
export function rowPicks(rows: readonly LessonRow[], at: RowsAt): string[] {
  const blocked = rowErrors(rows, at).size > 0 || partialRows(rows).length > 0;
  return blocked ? [] : picksFromRows(rows, at.tz);
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
  /** Where the fetched slots end: a later time is the series check's. */
  until?: string | undefined;
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
  const { until } = ctx;
  const state = pickState({ at, slots, stepMin: data.step_min, durationMin, now, until });
  const suggestions = CLASHING.has(state.kind) ? nearestFree({ at, slots, tz: ctx.tz }) : [];
  return { at, state, suggestions };
}
