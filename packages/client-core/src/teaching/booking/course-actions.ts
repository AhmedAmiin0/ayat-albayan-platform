import type { CourseStopPreview } from '@ab/shared';
import { counted, type PluralForm } from '@ab/core';
import { ApiError } from '../../core/http';

// Course actions for web and mobile: query key and error codes; words are injected.

export type CourseMoveKind = 'teacher' | 'times';

/** The query key of a student's course actions (invalidate it after a write). */
export const courseActionsKey = (studentId: string): readonly ['course-actions', string] => [
  'course-actions',
  studentId,
];

/** `t.courseActions.stop.lessons`: a zero line and the four Arabic count forms. */
export type StopWords = Readonly<Record<PluralForm | 'zero', string>>;

export function courseStopLessonsText(
  words: StopWords,
  preview: Pick<CourseStopPreview, 'futureLessons'>,
): string {
  return preview.futureLessons === 0 ? words.zero : counted(words, preview.futureLessons);
}

const STOP_CODES = [
  'already_cancelled',
  'course_unattributed',
  'has_future_lessons',
  'subscription_not_found',
  'refund_exceeds_allowed',
  'refund_mismatch',
  'refund_not_allowed',
  'not_your_student',
  'owed_exceeds_price',
  'stop_mismatch',
  'stripe_not_configured',
] as const;
export type CourseStopErrorCode = (typeof STOP_CODES)[number] | 'generic';

const MOVE_CODES = [
  'conflict',
  'course_finished',
  'course_not_found',
  'course_exists',
  'course_changed',
  'course_unattributed',
  'custom_count_admin',
  'date_in_past',
  'days_count_mismatch',
  'no_change',
  'no_occurrences',
  'override_not_allowed',
  'same_teacher',
  'starts_before_course',
  'starts_before_subscription',
  'subscription_not_found',
  'teacher_inactive',
  'teacher_not_found',
] as const;
export type CourseMoveErrorCode = (typeof MOVE_CODES)[number] | 'generic';

function codeOf(error: unknown): unknown {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null)
    return undefined;
  return 'code' in error.body ? error.body.code : undefined;
}

/** The `t.courseActions.errors` key of a failed stop. */
export function courseStopErrorCode(error: unknown): CourseStopErrorCode {
  const code = codeOf(error);
  return STOP_CODES.find((c) => c === code) ?? 'generic';
}

/** The `t.courseActions.errors` key of a failed teacher / time change. */
export function courseMoveErrorCode(error: unknown): CourseMoveErrorCode {
  const code = codeOf(error);
  return MOVE_CODES.find((c) => c === code) ?? 'generic';
}
