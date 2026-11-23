import { isOpenLesson, type SalesScheduleLesson } from '@ab/shared';

export interface CorrectableInput {
  now: Date;
  /** settings.lesson_confirmation_required. */
  required: boolean;
  /** She holds lessons.cancel. */
  holds: boolean;
}

type Lesson = Pick<SalesScheduleLesson, 'status' | 'ends_at'>;

/** Cancel only while no confirmation is required and before the end; then outcome correction. */
export function canSalesCorrect(lesson: Lesson, input: CorrectableInput): boolean {
  const upcoming = isOpenLesson(lesson.status) && Date.parse(lesson.ends_at) > input.now.getTime();
  return input.holds && !input.required && upcoming;
}
