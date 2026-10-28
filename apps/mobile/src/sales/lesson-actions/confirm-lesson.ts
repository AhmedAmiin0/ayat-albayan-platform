import type { SalesScheduleLesson } from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { rescheduleFailure } from '@/teaching';

/**
 * «تأكيد الحلقة» (owner 2026-10-28): ANY lesson, hers or not (the family's «نعم» is in a chat every
 * assistant sees), while it is scheduled and has not ended, with lessons.confirm. The API checks again.
 */
export function canConfirmLesson(lesson: SalesScheduleLesson, input: { now: Date; holds: boolean }): boolean {
  return input.holds && lesson.status === 'scheduled' && Date.parse(lesson.ends_at) > input.now.getTime();
}

/** The confirm's own wording for lesson_ended and invalid_transition; the lessons wording for anything else. */
export function confirmFailureText(error: unknown): string {
  const body = error instanceof ApiError && typeof error.body === 'object' && error.body !== null ? (error.body as { code?: unknown }) : {};
  if (body.code === 'lesson_ended') return t.sales.lessonActions.confirmEnded;
  if (body.code === 'invalid_transition') return t.sales.lessonActions.confirmInvalid;
  const failure = rescheduleFailure(error);
  return failure.kind === 'error' ? failure.text : t.common.error;
}
