import type { LessonView } from '@ab/shared';

// R-SCH-11 «عدّل الوقت» wire contract (docs/10 §10). STAND-INS: the API builder moves these into
// @ab/shared (schemas/lesson-time.ts, lessons/time-edit.ts, LessonView). After the merge, delete
// this file and import the shared names; the shapes below are the spec's, field for field.

/** `move` = scheduled / confirmed lessons; `correct` = completed / late (fix what was recorded). */
export type TimeEditMode = 'move' | 'correct';

export interface TimeEditInfo {
  at: string;
  reason: string | null;
  was: { starts_at: string; ends_at: string };
}

/** The new LessonView fields, optional so an old cached lesson stays valid. */
export type EditableLesson = LessonView & { time_edit_mode?: TimeEditMode | null; time_edit?: TimeEditInfo | null };

/** PATCH /lessons/:id/time body (`lessonTimeEditSchema`). */
export interface LessonTimeEdit {
  expectedStartsAt: string;
  startsAt: string;
  durationMin: number;
  reason?: string;
  notify?: boolean;
  override?: { reason: string };
}

/** PATCH /lessons/:id/time response. */
export interface TimeEditResult {
  lesson: LessonView;
  notified: number;
  payout: 'none' | 'draft_stale';
  pdf_refresh: boolean;
}

/** What the admin may do to this lesson's time; null for a teacher or a closed lesson. */
export const timeEditMode = (lesson: LessonView): TimeEditMode | null => (lesson as EditableLesson).time_edit_mode ?? null;

/** Who changed the time and from what, once it was edited. */
export const timeEditInfo = (lesson: LessonView): TimeEditInfo | null => (lesson as EditableLesson).time_edit ?? null;
