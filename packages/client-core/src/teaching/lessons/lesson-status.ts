import {
  lessonStatusStyle,
  needsConfirmation,
  type LessonStatus,
  type LessonView,
  type StatusStyle,
} from '@ab/shared';

// «يحتاج تأكيد» only while the academy requires a confirmation (settings.lesson_confirmation_required,
// owner 2026-11-02). Otherwise a scheduled lesson is simply an upcoming one: its own words and a
// neutral, waiting look (never the «دورك» tone).

/** A scheduled lesson when no confirmation is required: informational, waiting. */
export const UPCOMING_LESSON_STYLE: StatusStyle = { tone: 'neutral', glyph: 'hollow' };

/** The words for a status: `labels` (enums.lessonStatus or a short set), `upcoming` when it needs none. */
export interface LessonStatusWords {
  labels: Readonly<Record<LessonStatus, string>>;
  upcoming: string;
}

const isUpcoming = (status: LessonStatus, required: boolean): boolean =>
  status === 'scheduled' && !needsConfirmation(status, required);

export function lessonStatusLabel(status: LessonStatus, required: boolean, words: LessonStatusWords): string {
  return isUpcoming(status, required) ? words.upcoming : words.labels[status];
}

export function lessonStatusLook(status: LessonStatus, required: boolean): StatusStyle {
  return isUpcoming(status, required) ? UPCOMING_LESSON_STYLE : lessonStatusStyle[status];
}

/**
 * «لم تنعقد؟»: a lesson the auto-held job closed with no report since (LessonView.auto_held) may still
 * be recorded as cancelled by its teacher or excused by the student (POST …/cancel, by teacher | student).
 */
export const canCorrectAutoHeld = (lesson: Pick<LessonView, 'status' | 'auto_held'>): boolean =>
  lesson.status === 'completed' && lesson.auto_held === true;
