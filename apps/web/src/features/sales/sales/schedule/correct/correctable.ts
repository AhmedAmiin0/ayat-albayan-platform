import { canCorrectAutoHeld } from '@ab/client-core';
import { isOpenLesson, type SalesScheduleLesson } from '@ab/shared';

export interface CorrectableInput {
  now: Date;
  /** settings.lesson_confirmation_required. */
  required: boolean;
  /** She holds lessons.cancel. */
  holds: boolean;
}

type Lesson = Pick<SalesScheduleLesson, 'status' | 'ends_at'> & { auto_held?: boolean };

const endedOpen = (lesson: Lesson, now: Date): boolean =>
  isOpenLesson(lesson.status) && Date.parse(lesson.ends_at) <= now.getTime();

/**
 * «لم تنعقد؟» for sales (owner 2026-11-02, POST /sales/lessons/:id/cancel by teacher | student): a
 * lesson held automatically, or, while no confirmation is required, one that ended still open.
 */
export function canSalesCorrect(lesson: Lesson, input: CorrectableInput): boolean {
  const due = canCorrectAutoHeld(lesson) || (!input.required && endedOpen(lesson, input.now));
  return input.holds && due;
}
