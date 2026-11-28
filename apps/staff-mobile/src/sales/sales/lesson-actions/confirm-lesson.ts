import type { ClockCycle } from '@ab/time';
import { ApiError, t } from '@ab/mobile-kit';
import { rescheduleFailure } from '@/teaching';

/** Own wording for lesson_ended and invalid_transition; the lessons wording for anything else. */
export function confirmFailureText(error: unknown, cycle: ClockCycle, tz: string): string {
  const body = error instanceof ApiError && typeof error.body === 'object' && error.body !== null ? (error.body as { code?: unknown }) : {};
  if (body.code === 'lesson_ended') return t.sales.lessonActions.confirmEnded;
  if (body.code === 'invalid_transition') return t.sales.lessonActions.confirmInvalid;
  const failure = rescheduleFailure(error, cycle, tz);
  return failure.kind === 'error' ? failure.text : t.common.error;
}
