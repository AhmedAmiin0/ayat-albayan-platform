import type { LessonStatus } from '../enums/index.js';

// «عدّل الوقت» (R-SCH-11): edit ONE lesson's time in place (same row, report, payments), unlike
// «غيّر الميعاد» which closes the row as `rescheduled` and creates a twin (docs/10 §10).
// - move: a scheduled / confirmed lesson goes to a future time.
// - correct: a held (completed / late) lesson's recorded start or length is fixed, same day.
// Every other status (cancelled_*, rescheduled, excused, no_show) cannot be edited (409).

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
] as const;
export type TimeEditError = (typeof TIME_EDIT_ERRORS)[number];

/**
 * «45 دقيقة»: the named length ('30' / '45' / '60' / '90' in the enums.duration table), else
 * `other` ("{n} دقيقة") so a migrated 40-minute lesson never shows as a bare number.
 */
export const durationText = (min: number, named: Record<string, string | undefined>, other: string): string =>
  named[String(min)] ?? other.replace('{n}', String(min));

/** The `{ month: '2026-09', status: 'approved' }` of a 409 `payout_locked` body, else null. */
export function payoutLockOf(body: unknown): { month: string; status: string } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { code, month, status } = body as Record<string, unknown>;
  return code === 'payout_locked' && typeof month === 'string' && typeof status === 'string' ? { month, status } : null;
}
