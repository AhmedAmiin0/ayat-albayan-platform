import { salesStudentFileRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { SalesStudentFileCalls } from './student-file-api.types';

/** A student's file as any salesperson reads it, on one api client. */
export function salesStudentFileCalls(client: ApiClient): SalesStudentFileCalls {
  const call = callWith(client);
  return {
    reportPdf: ({ studentId, reportId }) =>
      call({ route: salesStudentFileRoutes.reportPdf, params: { id: studentId, reportId } }),
  };
}
