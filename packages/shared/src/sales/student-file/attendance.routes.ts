import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { attendanceMonthInput, studentAttendanceTableSchema } from './attendance.schemas';

/** The admin's view of a student's attendance log, on the student file (`mine` always true). */
export const studentAttendanceRoutes = {
  /** 404 student_not_found, 400 invalid_month. */
  table: defineRoute({
    permissions: ['students.read'],
    tags: ['students'],
    method: 'GET',
    path: '/students/:id/attendance',
    params: z.object({ id: id() }),
    query: attendanceMonthInput,
    response: studentAttendanceTableSchema,
  }),
};
