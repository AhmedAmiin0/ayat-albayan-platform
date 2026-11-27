import type { LessonStatus } from '@ab/catalog';
import type { TimeEditMode } from '../lesson-view/lesson-view.schemas';

// R-SCH-11 edits one lesson's time in place, unlike reschedule which creates a twin (docs/10 §10).

const MODES: Partial<Record<LessonStatus, TimeEditMode>> = {
  scheduled: 'move',
  confirmed: 'move',
  completed: 'correct',
  late: 'correct',
};

/** What an admin may do to this lesson's time, null = nothing. */
export const timeEditMode = (status: LessonStatus): TimeEditMode | null => MODES[status] ?? null;

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
  if (typeof body !== 'object' || body === null) return null;
  const { code, month, status } = body as Record<string, unknown>;
  return code === 'payout_locked' && typeof month === 'string' && typeof status === 'string' ? { month, status } : null;
}
