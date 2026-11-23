import type { CancelBy } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** Teacher cancels are not counted; a student excuse follows the late-cancel rule. */
export const CORRECT_BY = ['teacher', 'student'] as const satisfies readonly CancelBy[];
export type CorrectBy = (typeof CORRECT_BY)[number];

export const CORRECT_BY_LABEL: Record<CorrectBy, string> = {
  teacher: t.lessons.correct.byTeacher,
  student: t.lessons.correct.byStudent,
};
