import type { LessonTimeEditView, LessonView, TimeEditMode } from '@ab/shared';

// R-SCH-11 «عدّل الوقت»: the wire contract lives in @ab/shared (schemas/lesson-time.ts,
// lessons/time-edit.ts, LessonView). This file only re-exports it under the names the form uses.
export type { LessonTimeEdit, TimeEditMode, TimeEditResult } from '@ab/shared';
export type TimeEditInfo = LessonTimeEditView;
export type EditableLesson = LessonView;

/** What the admin may do to this lesson's time; null for a teacher or a closed lesson. */
export const timeEditMode = (lesson: LessonView): TimeEditMode | null => lesson.time_edit_mode ?? null;

/** Who changed the time and from what, once it was edited. */
export const timeEditInfo = (lesson: LessonView): LessonTimeEditView | null => lesson.time_edit ?? null;
