import { counted, type CourseStopPreview, type PluralForm } from '@ab/shared';
import { ApiError } from '../../core/http/index.js';

// The student profile's «إلغاء الاشتراك» / «تغيير المعلم» / «تغيير موعد الحلقات» (owner 2026-10-30) for web and
// mobile: the API paths, the query key, the stop sheet's lines and the error codes. Words are injected
// (each app's `t.courseActions`).

const student = (studentId: string): string => `/students/${studentId}`;

/** GET ?subscriptionId= (the stop sheet's preview) and POST (the stop). */
export const courseStopPath = (studentId: string): string => `${student(studentId)}/course-stop`;
export const courseStopPreviewPath = (input: { studentId: string; subscriptionId: string }): string =>
  `${courseStopPath(input.studentId)}?subscriptionId=${encodeURIComponent(input.subscriptionId)}`;

export type CourseMoveKind = 'teacher' | 'times';

/** The base of a change: GET `${base}/change?subscriptionId=`, POST `${base}/change/check` and `${base}/change`. */
export const courseMoveBase = (input: { studentId: string; kind: CourseMoveKind }): string =>
  `${student(input.studentId)}/${input.kind === 'teacher' ? 'course-teacher' : 'course-times'}`;

export const courseMoveViewPath = (input: { studentId: string; kind: CourseMoveKind; subscriptionId: string }): string =>
  `${courseMoveBase(input)}/change?subscriptionId=${encodeURIComponent(input.subscriptionId)}`;

/** GET: the teachers «تغيير المعلم» offers (the student's program and gender preference). */
export const courseTeacherOptionsPath = (studentId: string): string => `${student(studentId)}/course-teacher/teachers`;

/** The query key of a student's course actions (invalidate it with the student's file after a write). */
export const courseActionsKey = (studentId: string): readonly ['course-actions', string] => ['course-actions', studentId];

/** `t.courseActions.stop.lessons`: a zero line and the four Arabic count forms. */
export type StopWords = Readonly<Record<PluralForm | 'zero', string>>;

/** «ستُلغى N حلقات قادمة» (or the zero line). */
export function courseStopLessonsText(words: StopWords, preview: Pick<CourseStopPreview, 'futureLessons'>): string {
  return preview.futureLessons === 0 ? words.zero : counted(words, preview.futureLessons);
}

const STOP_CODES = ['already_cancelled', 'has_future_lessons', 'subscription_not_found'] as const;
export type CourseStopErrorCode = (typeof STOP_CODES)[number] | 'generic';

const MOVE_CODES = [
  'conflict',
  'course_finished',
  'course_not_found',
  'course_exists',
  'course_changed',
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
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) return undefined;
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
