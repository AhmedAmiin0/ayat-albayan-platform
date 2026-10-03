import type { LessonView } from '@ab/shared';

// STAND-INS for the R-SCH-11 contract that Builder A adds to @ab/shared (spec §2). Same names and
// shapes, so after the merge this file can re-export them from '@ab/shared' and go.

export type TimeEditMode = 'move' | 'correct';

/** LessonView.time_edit: the last in-place edit, from the three lessons.time_edit_* columns. */
export interface TimeEditInfo {
  at: string;
  reason: string | null;
  was: { starts_at: string; ends_at: string };
}

/** The two optional fields LessonView gains; a plain LessonView (old cache, teacher) has neither. */
export interface TimeEditFields {
  /** Admin only: `move` (scheduled / confirmed), `correct` (completed / late), null = not editable. */
  time_edit_mode?: TimeEditMode | null;
  time_edit?: TimeEditInfo | null;
}

/** A lesson as the sheet reads it: LessonView plus the stand-in fields. */
export type EditableLesson = LessonView & TimeEditFields;

/** PATCH /lessons/:id/time (lessonTimeEditSchema). */
export interface LessonTimeEditBody {
  /** The start the admin saw: a lesson changed by someone else answers 409 stale_time. */
  expectedStartsAt: string;
  startsAt: string;
  durationMin: number;
  reason?: string;
  notify?: boolean;
}

/** The API's answer (TimeEditResult). */
export interface TimeEditResult {
  lesson: LessonView;
  notified: number;
  payout: 'none' | 'draft_stale';
  pdf_refresh: boolean;
}

/** What «عدّل الوقت» may do to this lesson; null for a teacher, an old cache or a closed lesson. */
export function editMode(lesson: EditableLesson): TimeEditMode | null {
  return lesson.time_edit_mode ?? null;
}
