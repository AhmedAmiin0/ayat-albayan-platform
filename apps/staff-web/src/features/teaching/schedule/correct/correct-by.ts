import type { CancelBy } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

/**
 * «لم تنعقد؟» (owner 2026-11-02): a lesson not held after all was cancelled by its teacher
 * («ألغاها المعلم/ة», not counted) or the student excused himself («اعتذر الطالب», late-cancel
 * rule).
 */
export const CORRECT_BY = ['teacher', 'student'] as const satisfies readonly CancelBy[];
export type CorrectBy = (typeof CORRECT_BY)[number];

export const CORRECT_BY_LABEL: Record<CorrectBy, string> = {
  teacher: t.lessons.correct.byTeacher,
  student: t.lessons.correct.byStudent,
};
