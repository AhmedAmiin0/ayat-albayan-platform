import type { RouteResult } from '@ab/core';
import type { salesStudentFileRoutes, studentAttendanceRoutes } from '@ab/shared';

type Answer<K extends keyof typeof salesStudentFileRoutes> = Promise<
  RouteResult<(typeof salesStudentFileRoutes)[K]>
>;

export interface SalesStudentReport {
  studentId: string;
  reportId: string;
}

/** No month: the current Riyadh month. */
export interface StudentAttendanceMonth {
  studentId: string;
  month?: string;
}

export interface SalesStudentFileCalls {
  details: (studentId: string) => Answer<'details'>;
  reportPdf: (input: SalesStudentReport) => Answer<'reportPdf'>;
  attendance: (input: StudentAttendanceMonth) => Answer<'attendance'>;
}

export interface StudentAttendanceCalls {
  table: (
    input: StudentAttendanceMonth,
  ) => Promise<RouteResult<typeof studentAttendanceRoutes.table>>;
}
