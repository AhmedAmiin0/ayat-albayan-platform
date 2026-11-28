import { salesStudentFileRoutes, studentAttendanceRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { SalesStudentFileCalls, StudentAttendanceCalls } from './student-file-api.types';

/** A student's file as any salesperson reads it, on one api client. */
export function salesStudentFileCalls(client: ApiClient): SalesStudentFileCalls {
  const call = callWith(client);
  return {
    details: (studentId) =>
      call({ route: salesStudentFileRoutes.details, params: { id: studentId } }),
    reportPdf: ({ studentId, reportId }) =>
      call({ route: salesStudentFileRoutes.reportPdf, params: { id: studentId, reportId } }),
    attendance: ({ studentId, month }) =>
      call({
        route: salesStudentFileRoutes.attendance,
        params: { id: studentId },
        query: { month },
      }),
  };
}

/** The admin's attendance log on the student file, on one api client. */
export function studentAttendanceCalls(client: ApiClient): StudentAttendanceCalls {
  const call = callWith(client);
  return {
    table: ({ studentId, month }) =>
      call({ route: studentAttendanceRoutes.table, params: { id: studentId }, query: { month } }),
  };
}
