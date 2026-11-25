import type { LessonStatus } from '@ab/catalog';
import { lessonStatusStyle, type StatusStyle } from '@ab/money';
import { needsConfirmation } from '@ab/schedule';

// Needs confirmation only while settings.lesson_confirmation_required is on; else neutral look.

/** A scheduled lesson when no confirmation is required: informational, waiting. */
export const UPCOMING_LESSON_STYLE: StatusStyle = { tone: 'neutral', glyph: 'hollow' };

/**
 * The words for a status: `labels` (enums.lessonStatus or a short set), `upcoming` when it needs
 * none.
 */
export interface LessonStatusWords {
  labels: Readonly<Record<LessonStatus, string>>;
  upcoming: string;
}

const isUpcoming = (status: LessonStatus, required: boolean): boolean =>
  status === 'scheduled' && !needsConfirmation(status, required);

export function lessonStatusLabel(
  status: LessonStatus,
  required: boolean,
  words: LessonStatusWords,
): string {
  return isUpcoming(status, required) ? words.upcoming : words.labels[status];
}

export function lessonStatusLook(status: LessonStatus, required: boolean): StatusStyle {
  return isUpcoming(status, required) ? UPCOMING_LESSON_STYLE : lessonStatusStyle[status];
}

