import {
  DURATIONS,
  payoutFor,
  type Duration,
  type LessonStatus,
  type PayoutLine,
  type PayoutStatus,
} from '@ab/shared';
import { MINUTE, zonedToUtc } from '../teachers/availability/zoned-time';

// Pure payout decisions (R-PAY-02, R-TCH-04, issue E3): which lessons count, the month window in
// the teacher's tz, and what generate does with a teacher's row.

export interface PayoutTeacher {
  id: string;
  tz: string;
  rate_30: number | null;
  rate_45: number | null;
  rate_60: number | null;
  rate_90: number | null;
}
export interface PayoutLesson {
  id: string;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
}
export interface PayoutBreakdown {
  lines: PayoutLine[];
  lesson_ids: string[];
  statuses: LessonStatus[];
  /** Lessons whose length is not 30/45/60/90: no rate slot, left out (TODO(R-PAY-02) owner). */
  skipped_lesson_ids: string[];
}

/** `YYYY-MM` in `tz` → the half-open UTC window [1st 00:00, next 1st 00:00). */
export function monthWindow(month: string, tz: string): { from: string; to: string } {
  const [y = 0, m = 1] = month.split('-').map(Number);
  const first = Date.UTC(y, m - 1, 1);
  const next = Date.UTC(y, m, 1);
  return {
    from: new Date(zonedToUtc(first, 0, tz)).toISOString(),
    to: new Date(zonedToUtc(next, 0, tz)).toISOString(),
  };
}

/** Paid lessons per duration; lengths outside DURATIONS are returned apart, never rounded. */
export function byDuration(lessons: readonly PayoutLesson[]) {
  const counts: Partial<Record<Duration, number>> = {};
  const counted: string[] = [];
  const skipped: string[] = [];
  for (const l of lessons) {
    const minutes = Math.round((Date.parse(l.ends_at) - Date.parse(l.starts_at)) / MINUTE);
    const d = DURATIONS.find((x) => x === minutes);
    if (d === undefined) skipped.push(l.id);
    else {
      counts[d] = (counts[d] ?? 0) + 1;
      counted.push(l.id);
    }
  }
  return { counts, counted, skipped };
}

export type PayoutAction =
  | { kind: 'frozen' }
  | { kind: 'clear'; deleteId: string | null }
  | { kind: 'missing'; durations: Duration[]; deleteId: string | null }
  | { kind: 'draft'; id: string | null; lessonsCount: number; amount: number; breakdown: PayoutBreakdown };

export interface PlanInput {
  teacher: PayoutTeacher;
  lessons: readonly PayoutLesson[];
  existing: { id: string; status: PayoutStatus } | undefined;
  statuses: LessonStatus[];
}

/**
 * Approved and paid rows are frozen; no paid lessons → no row (a stale draft is deleted); a
 * duration taught without a rate → the teacher is skipped and listed; otherwise a draft.
 */
export function planPayout(input: PlanInput): PayoutAction {
  const { existing } = input;
  if (existing && existing.status !== 'draft') return { kind: 'frozen' };
  const draftId = existing?.id ?? null;
  const paid = input.lessons.filter((l) => input.statuses.includes(l.status));
  const { counts, counted, skipped } = byDuration(paid);
  const t = input.teacher;
  const rates = { 30: t.rate_30, 45: t.rate_45, 60: t.rate_60, 90: t.rate_90 };
  const calc = payoutFor({ lessons: counts, rates });
  if (calc.missingRates.length > 0) return { kind: 'missing', durations: calc.missingRates, deleteId: draftId };
  if (calc.lessonsCount === 0 && skipped.length === 0) return { kind: 'clear', deleteId: draftId };
  const breakdown = { lines: calc.lines, lesson_ids: counted, statuses: input.statuses, skipped_lesson_ids: skipped };
  return { kind: 'draft', id: draftId, lessonsCount: calc.lessonsCount, amount: calc.amount, breakdown };
}

