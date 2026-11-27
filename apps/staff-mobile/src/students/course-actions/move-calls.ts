import { courseTeacherCalls, courseTimesCalls } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import type { ChangeCalls } from '@/sales-course';

const teacherMoves = courseTeacherCalls({ apiFetch, apiSend });
const timesMoves = courseTimesCalls({ apiFetch, apiSend });

/** The change flow on `/students/:id/course-times`. */
export const timesChangeCalls = (studentId: string): ChangeCalls => ({
  key: `times:${studentId}`,
  check: (body) => timesMoves.check(studentId, body),
  change: (body) => timesMoves.change(studentId, body),
});

/** The change flow on `/students/:id/course-teacher`, sending the new teacher. */
export const teacherChangeCalls = (studentId: string, teacherId: string): ChangeCalls => ({
  key: `teacher:${studentId}:${teacherId}`,
  check: (body) => teacherMoves.check(studentId, { ...body, teacherId }),
  change: (body) => teacherMoves.change(studentId, { ...body, teacherId }),
});
