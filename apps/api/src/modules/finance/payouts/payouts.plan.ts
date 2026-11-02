import { monthRangeIn } from '@ab/shared';
import type { LessonStatus, PayoutLine, PayoutStatus } from '@ab/shared';

// Pure payout decisions (R-PAY-02, R-TCH-04, issue E3): the month window in the teacher's tz, and
// what generate does with a teacher's row. WHICH lessons count and WHAT each pays is not decided
// here: the rows come from v_teacher_payable_lessons (migration 20261005000200), the same rule and
// the same frozen ledger amounts as the per-session earnings and the dashboard.

export interface PayoutTeacher {
  id: string;
  tz: string;
}
/** One v_teacher_payable_lessons row: amount null = the teacher has no rate to price it. */
export interface PayoutLesson {
  id: string;
  minutes: number;
  amount: number | null;
  status: LessonStatus;
}
export interface PayoutBreakdown {
  lines: PayoutLine[];
  lesson_ids: string[];
  statuses: LessonStatus[];
  /** Kept for rows written before 20261005000200; odd lengths are now pro-rated, never skipped. */
  skipped_lesson_ids: string[];
}

/** `YYYY-MM` in `tz` → the half-open UTC window [1st 00:00, next 1st 00:00). */
export function monthWindow(month: string, tz: string): { from: string; to: string } {
  const { from, to } = monthRangeIn(month, tz);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** One line per (length, per-lesson amount); amounts summed in cents. */
export function linesOf(lessons: readonly PayoutLesson[]): PayoutLine[] {
  const lines = new Map<string, PayoutLine>();
  for (const l of lessons) {
    if (l.amount === null) continue;
    const key = `${l.minutes}:${l.amount}`;
    const line = lines.get(key) ?? { duration: l.minutes, lessons: 0, rate: l.amount, amount: 0 };
    line.lessons += 1;
    line.amount = Math.round(line.amount * 100 + l.amount * 100) / 100;
    lines.set(key, line);
  }
  return [...lines.values()].sort((a, b) => a.duration - b.duration || (a.rate ?? 0) - (b.rate ?? 0));
}

type ApproveBlock = 'month_not_over' | 'reports_pending' | 'payout_stale';

/**
 * Approving freezes the month (E3), so it waits until the month has ended in the teacher's tz
 * (`to` of monthWindow) and every report of it is in: a report filed later could otherwise
 * complete a lesson that is never paid. A lesson whose time was edited («عدّل الوقت») after the
 * draft was calculated (`editedSince`) would be paid at the old length: calculate again first.
 */
export function approveBlock(input: { monthEnd: string; now: Date; pendingReports: number; editedSince: number }): ApproveBlock | null {
  if (input.now.getTime() < Date.parse(input.monthEnd)) return 'month_not_over';
  if (input.pendingReports > 0) return 'reports_pending';
  return input.editedSince > 0 ? 'payout_stale' : null;
}

export type PayoutAction =
  | { kind: 'frozen' }
  | { kind: 'clear'; deleteId: string | null }
  | { kind: 'missing'; durations: number[]; deleteId: string | null }
  | { kind: 'draft'; id: string | null; lessonsCount: number; amount: number; breakdown: PayoutBreakdown };

export interface PlanInput {
  teacher: PayoutTeacher;
  lessons: readonly PayoutLesson[];
  existing: { id: string; status: PayoutStatus } | undefined;
  /** The statuses the settings count, recorded in the breakdown. */
  statuses: LessonStatus[];
}

/**
 * Approved and paid rows are frozen; no counted lessons → no row (a stale draft is deleted); a
 * lesson the teacher has no rate for → the teacher is skipped and listed; otherwise a draft.
 */
export function planPayout(input: PlanInput): PayoutAction {
  const { existing, lessons } = input;
  if (existing && existing.status !== 'draft') return { kind: 'frozen' };
  const draftId = existing?.id ?? null;
  const unrated = [...new Set(lessons.filter((l) => l.amount === null).map((l) => l.minutes))].sort((a, b) => a - b);
  if (unrated.length > 0) return { kind: 'missing', durations: unrated, deleteId: draftId };
  if (lessons.length === 0) return { kind: 'clear', deleteId: draftId };
  const lines = linesOf(lessons);
  const amount = Math.round(lines.reduce((n, l) => n + l.amount * 100, 0)) / 100;
  const breakdown = { lines, lesson_ids: lessons.map((l) => l.id), statuses: input.statuses, skipped_lesson_ids: [] };
  return { kind: 'draft', id: draftId, lessonsCount: lessons.length, amount, breakdown };
}
