import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { signedDownloadSchema } from '../../reports';
import { attendanceMonthInput, studentAttendanceTableSchema } from './attendance.schemas';

const ACCESS = { permissions: ['self.sales_academy'], tags: ['sales'] } as const;

/** A student's file as any salesperson reads it (docs/16 row 36). */
export const salesStudentFileRoutes = {
  /** 1 h signed URL of the student's sent report; 404 another student's, 409 pdf_not_ready. */
  reportPdf: defineRoute({
    ...ACCESS,
    method: 'GET',
    path: '/sales/students/:id/reports/:reportId/pdf',
    params: z.object({ id: id(), reportId: id() }),
    response: signedDownloadSchema,
  }),
  /** Any student, `mine` on hers; 404 student_not_found, 400 invalid_month. */
  attendance: defineRoute({
    ...ACCESS,
    method: 'GET',
    path: '/sales/students/:id/attendance',
    params: z.object({ id: id() }),
    query: attendanceMonthInput,
    response: studentAttendanceTableSchema,
  }),
};
