import { isOpenLesson, type SalesScheduleLesson } from '@ab/shared';

export interface CorrectableInput {
  now: Date;
  /** settings.lesson_confirmation_required. */
  required: boolean;
  /** She holds lessons.cancel. */
  holds: boolean;
}

type Lesson = Pick<SalesScheduleLesson, 'status' | 'ends_at'>;

/** Completed: the sales payload has no auto_held, so the API decides (409 not_auto_held). */
export const isHeldLesson = (lesson: Lesson): boolean => lesson.status === 'completed';

/**
 * «لم تنعقد؟» for sales (owner 2026-11-02, POST /sales/lessons/:id/cancel by teacher | student): a
 * completed lesson (held automatically, whatever the setting is now), or, while no confirmation is
 * required, an open one before or after it ends. `now` is kept for the callers' signature.
 */
export function canSalesCorrect(lesson: Lesson, input: CorrectableInput): boolean {
  const due = isHeldLesson(lesson) || (!input.required && isOpenLesson(lesson.status));
  return input.holds && due;
}
