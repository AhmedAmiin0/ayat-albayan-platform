import { z } from 'zod';
import type { LessonStatus } from '@ab/catalog';

// R-SCH-11 edits one lesson's time in place, unlike reschedule which creates a twin (docs/10 §10).

export type TimeEditMode = 'move' | 'correct';

const MODES: Partial<Record<LessonStatus, TimeEditMode>> = {
  scheduled: 'move',
  confirmed: 'move',
  completed: 'correct',
  late: 'correct',
};

/** What an admin may do to this lesson's time, null = nothing. */
export const timeEditMode = (status: LessonStatus): TimeEditMode | null => MODES[status] ?? null;

/** LessonView.time_edit: the last in-place edit, from lessons.time_edit_*. */
export interface LessonTimeEditView {
  at: string;
  reason: string | null;
  was: { starts_at: string; ends_at: string };
}

/** Domain error codes of PATCH /lessons/:id/time (each has an ar.json lessons.error message). */
export const TIME_EDIT_ERRORS = [
  'stale_time',
  'payout_locked',
  'time_edit_not_allowed',
  'date_in_future',
  'correction_cross_day',
  'reason_required',
  'teacher_clash',
] as const;
export type TimeEditError = (typeof TIME_EDIT_ERRORS)[number];

/** Named length from enums.duration, else `other`, so 40 minutes never shows as a bare number. */
export const durationText = (
  min: number,
  named: Record<string, string | undefined>,
  other: string,
): string => named[String(min)] ?? other.replace('{n}', String(min));

/** The `{ month: '2026-09', status: 'approved' }` of a 409 `payout_locked` body, else null. */
export function payoutLockOf(body: unknown): { month: string; status: string } | null {
  const lock = payoutLockSchema.safeParse(body).data;
  return lock ? { month: lock.month, status: lock.status } : null;
}

const payoutLockSchema = z.object({
  code: z.literal('payout_locked'),
  month: z.string(),
  status: z.string(),
});
