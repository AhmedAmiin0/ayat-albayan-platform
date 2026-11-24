import { errorCode } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const ERRORS: Partial<Record<string, string>> = { lesson_started: t.teacherBoard.lessonStarted };

/** A refused confirm or cancel: 409 lesson_started says so, anything else offers a retry. */
export const teacherActionError = (error: unknown): string =>
  ERRORS[errorCode(error) ?? ''] ?? t.teacherBoard.actionFailed;
