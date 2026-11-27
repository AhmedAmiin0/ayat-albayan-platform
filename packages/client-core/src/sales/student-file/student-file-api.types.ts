import type { RouteResult } from '@ab/core';
import type { salesStudentFileRoutes } from '@ab/shared';

type Answer<K extends keyof typeof salesStudentFileRoutes> = Promise<
  RouteResult<(typeof salesStudentFileRoutes)[K]>
>;

export interface SalesStudentReport {
  studentId: string;
  reportId: string;
}

export interface SalesStudentFileCalls {
  reportPdf: (input: SalesStudentReport) => Answer<'reportPdf'>;
}
