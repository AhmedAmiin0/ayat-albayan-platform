import { isOpenLesson, type SalesScheduleLesson } from '@ab/shared';

export interface CorrectableInput {
  now: Date;
  /** settings.lesson_confirmation_required. */
  required: boolean;
  /** She holds lessons.cancel. */
  holds: boolean;
}

type Lesson = Pick<SalesScheduleLesson, 'status' | 'ends_at'>;

/**
 * «لم تنعقد؟» for sales (owner 2026-11-02, POST /sales/lessons/:id/cancel by teacher | student):
 * while no confirmation is required, an open lesson before it ends. After the end, and on a held /
 * absent lesson, «تصحيح حالة الحلقة» takes over (CorrectOutcome, owner 2026-11-03).
 */
export function canSalesCorrect(lesson: Lesson, input: CorrectableInput): boolean {
  const upcoming = isOpenLesson(lesson.status) && Date.parse(lesson.ends_at) > input.now.getTime();
  return input.holds && !input.required && upcoming;
}
