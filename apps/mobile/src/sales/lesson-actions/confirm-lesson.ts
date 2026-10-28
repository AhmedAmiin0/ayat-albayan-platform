import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { rescheduleFailure } from '@/teaching';

/** The confirm's own wording for lesson_ended and invalid_transition; the lessons wording for anything else. */
export function confirmFailureText(error: unknown): string {
  const body = error instanceof ApiError && typeof error.body === 'object' && error.body !== null ? (error.body as { code?: unknown }) : {};
  if (body.code === 'lesson_ended') return t.sales.lessonActions.confirmEnded;
  if (body.code === 'invalid_transition') return t.sales.lessonActions.confirmInvalid;
  const failure = rescheduleFailure(error);
  return failure.kind === 'error' ? failure.text : t.common.error;
}
