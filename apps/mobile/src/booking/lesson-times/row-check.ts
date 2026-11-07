import { lessonAt, nearestFree, pickState, type LessonRow, type PickState } from '@ab/client-core';
import { otherZoneClock, type SlotsResponse } from '@ab/shared';
import type { ViewerClock } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';

// One lesson row's reading (owner 2026-11-07): its instant in the student's zone, what the slot
// data says about it (pickState), the nearest free times when it is busy or outside availability,
// and the viewer's and the teacher's own clocks beside it. Pure.

export interface RowCheck {
  at: string | null;
  /** null while the row is not filled or the slots are still loading. */
  state: PickState | null;
  nearest: string[];
  beside: string[];
}

interface RowContext {
  /** The student's zone: the row's date and time are read there. */
  tz: string;
  slots: SlotsResponse | undefined;
  /** The fetched window's end (slotWindow `to`). */
  until: string;
  durationMin: number;
  now: Date;
  viewer: ViewerClock;
}

const SUGGEST: Record<PickState['kind'], boolean> = {
  free: false,
  busy: true,
  outside: true,
  past: false,
  unchecked: false,
};

/** Beside a time in the student's zone: the viewer's and the teacher's, each when it differs. */
type BesideContext = Pick<RowContext, 'tz' | 'slots' | 'viewer'>;

export function besideTimes(at: string, ctx: BesideContext): string[] {
  const when = new Date(at);
  const opts = { tz: ctx.tz, cycle: ctx.viewer.cycle, locale };
  const mine = otherZoneClock(when, ctx.viewer.tz, opts);
  const teacher = otherZoneClock(when, ctx.slots?.teacher_tz, opts);
  return [
    mine === null ? null : t.lessonTimes.viewerTime.replace('{time}', mine),
    teacher === null ? null : t.lessonTimes.teacherTime.replace('{time}', teacher),
  ].filter((line): line is string => line !== null);
}

function stateOf(at: string, ctx: RowContext): PickState | null {
  const data = ctx.slots;
  if (!data) return null;
  const base = { at, slots: data.slots, stepMin: data.step_min, durationMin: ctx.durationMin };
  return pickState({ ...base, now: ctx.now, until: ctx.until });
}

export function rowCheck(row: LessonRow, ctx: RowContext): RowCheck {
  const at = lessonAt(row, ctx.tz);
  if (at === null) return { at, state: null, nearest: [], beside: [] };
  const state = stateOf(at, ctx);
  const suggest = state !== null && SUGGEST[state.kind];
  const nearest = suggest ? nearestFree({ at, slots: ctx.slots?.slots ?? [], tz: ctx.tz }) : [];
  return { at, state, nearest, beside: besideTimes(at, ctx) };
}
