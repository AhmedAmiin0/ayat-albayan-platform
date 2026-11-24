import type { LessonView, TimeEditMode } from '@ab/schedule';

// R-SCH-11: the contract (LessonView, LessonTimeEdit, TimeEditResult) lives in @ab/shared.

/** Null for a teacher, an old cache or a closed lesson. */
export function editMode(lesson: LessonView): TimeEditMode | null {
  return lesson.time_edit_mode ?? null;
}
