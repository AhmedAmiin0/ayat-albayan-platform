import type { LessonTimeEdit, LessonTimeEditView, LessonView, TimeEditMode } from '@ab/shared';

// R-SCH-11: the contract lives in @ab/shared; these are the names the sheet uses.
export type { TimeEditMode, TimeEditResult } from '@ab/shared';
export type TimeEditInfo = LessonTimeEditView;
export type EditableLesson = LessonView;
export type LessonTimeEditBody = LessonTimeEdit;

/** What «عدّل الوقت» may do to this lesson; null for a teacher, an old cache or a closed lesson. */
export function editMode(lesson: EditableLesson): TimeEditMode | null {
  return lesson.time_edit_mode ?? null;
}
