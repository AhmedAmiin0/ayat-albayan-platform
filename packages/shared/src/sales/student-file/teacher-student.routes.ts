import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { attendanceMonthQuery } from '../student/student-attendance';
import { studentAttendanceTableSchema } from './attendance.schemas';
import { teacherStudentHeadSchema } from './teacher-student.schemas';

const ACCESS = { permissions: ['self.teacher'], tags: ['teachers'] } as const;
const params = z.object({ id: id() });

/** A student she may open (docs/46 C5, docs/47): only her own lessons with the student. */
export const teacherStudentFileRoutes = {
  head: defineRoute({
    ...ACCESS,
    method: 'GET',
    path: '/teachers/me/students/:id',
    params,
    response: teacherStudentHeadSchema,
  }),
  /** `?month=YYYY-MM` in her zone; absent: the current month. */
  attendance: defineRoute({
    ...ACCESS,
    method: 'GET',
    path: '/teachers/me/students/:id/attendance',
    params,
    query: attendanceMonthQuery,
    response: studentAttendanceTableSchema,
  }),
};
