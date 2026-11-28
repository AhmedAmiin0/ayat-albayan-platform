import { courseMoveErrorCode, courseTeacherCalls, courseTimesCalls } from '@ab/client-core';
import { apiFetch, apiSend, t } from '@ab/web-kit';
import type { CourseChangeTarget } from '@/features/teaching/booking';

const teacherMoves = courseTeacherCalls({ apiFetch, apiSend });
const timesMoves = courseTimesCalls({ apiFetch, apiSend });

const OWN = new Set([
  'same_teacher',
  'teacher_inactive',
  'teacher_not_found',
  'subscription_not_found',
]);

const errorText = (error: unknown): string | null => {
  const code = courseMoveErrorCode(error);
  return OWN.has(code) ? t.courseActions.errors[code] : null;
};

/** The course-change form on `/students/:id/course-times`, with the profile's refusal codes. */
export const timesMoveTarget = (studentId: string): CourseChangeTarget => ({
  key: `times:${studentId}`,
  check: (body) => timesMoves.check(studentId, body),
  change: (body) => timesMoves.change(studentId, body),
  errorText,
});

/** The course-change form on `/students/:id/course-teacher`, sending the new teacher. */
export const teacherMoveTarget = (studentId: string, teacherId: string): CourseChangeTarget => ({
  key: `teacher:${studentId}:${teacherId}`,
  check: (body) => teacherMoves.check(studentId, { ...body, teacherId }),
  change: (body) => teacherMoves.change(studentId, { ...body, teacherId }),
  errorText,
});
