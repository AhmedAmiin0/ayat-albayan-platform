import { errorCode } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';

const ERRORS: Partial<Record<string, string>> = { lesson_started: t.teacherBoard.lessonStarted };

/** «سأحضر» / «إلغاء الحلقة» refused: 409 lesson_started says so, anything else a retry. */
export const teacherActionError = (error: unknown): string =>
  ERRORS[errorCode(error) ?? ''] ?? t.teacherBoard.actionFailed;
