import {
  correctionTargets,
  isOpenLesson,
  type CorrectTo,
  type SalesCancel,
  type SalesScheduleLesson,
} from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

/** Who cancelled (POST /sales/lessons/:id/cancel `by`); none = «ألغتها الإدارة». */
export type SalesCancelBy = NonNullable<SalesCancel['by']>;

/** Her choice's words: «ألغتها الإدارة» / «ألغاها المعلم/ة» / «اعتذر الطالب». */
export const CANCEL_BY_LABEL: Record<SalesCancelBy, string> = {
  admin: t.enums.lessonStatus.cancelled_by_admin,
  teacher: t.lessons.correct.byTeacher,
  student: t.lessons.correct.byStudent,
};

type When = 'before' | 'after';

/**
 * The `by` choices on an open lesson (owner 2026-11-02). Confirmation required, as before:
 * the academy only, until it ends. Without one: the academy, the teacher or the student
 * until it ends, then the teacher or the student only (the API refuses the academy then).
 */
const CHOICES: Record<'on' | 'off', Record<When, readonly SalesCancelBy[]>> = {
  on: { before: ['admin'], after: [] },
  off: { before: ['admin', 'teacher', 'student'], after: ['teacher', 'student'] },
};

interface CancelRights {
  /** «إلغاء الحلقة» and who may be recorded; empty = no cancel. */
  cancelBy: readonly SalesCancelBy[];
  /**
   * «تصحيح حالة الحلقة» targets (owner 2026-11-03): an ended open lesson, or a held / absent one
   * (the sales row has no auto flag: 409 not_auto_held unless the job settled it); [] = none.
   */
  correct: readonly CorrectTo[];
}

interface CancelInput {
  now: Date;
  /** She holds lessons.cancel. */
  holds: boolean;
  /** settings.lesson_confirmation_required. */
  required: boolean;
}

const hasStudents = (lesson: SalesScheduleLesson): boolean => lesson.students.length > 0;
const choicesFor = (lesson: SalesScheduleLesson, input: CancelInput): readonly SalesCancelBy[] => {
  const table = CHOICES[input.required ? 'on' : 'off'];
  return isOpenLesson(lesson.status) ? table[whenOf(lesson, input.now)] : [];
};
const whenOf = (lesson: SalesScheduleLesson, now: Date): When =>
  Date.parse(lesson.ends_at) > now.getTime() ? 'before' : 'after';

/** What «إلغاء الحلقة» and «تصحيح حالة الحلقة» offer on this lesson; the API checks each again. */
export function salesCancelRights(lesson: SalesScheduleLesson, input: CancelInput): CancelRights {
  const may = input.holds && hasStudents(lesson);
  return {
    cancelBy: may ? choicesFor(lesson, input) : [],
    correct: may ? correctionTargets(lesson, input.now) : [],
  };
}

/** Anything to do here: a cancel or a correction. */
export const offersCancel = (rights: CancelRights): boolean =>
  rights.cancelBy.length > 0 || rights.correct.length > 0;
