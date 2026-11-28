import { teacherEarningRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { TeacherEarningCalls } from './teacher-earnings-api.types';

/** An admin's view of one named teacher's earnings, and the admin's writes. */
export function teacherEarningCalls(client: ApiClient): TeacherEarningCalls {
  const call = callWith(client);
  return {
    summary: () => call({ route: teacherEarningRoutes.summary }),
    balance: (teacherId) => call({ route: teacherEarningRoutes.balance, params: { teacherId } }),
    sessions: (teacherId, query) =>
      call({ route: teacherEarningRoutes.sessions, params: { teacherId }, query }),
    payments: (teacherId, query) =>
      call({ route: teacherEarningRoutes.payments, params: { teacherId }, query }),
    receipt: (id) => call({ route: teacherEarningRoutes.receipt, params: { id } }),
    record: (teacherId, body) =>
      call({ route: teacherEarningRoutes.record, params: { teacherId }, body }),
    voidPayment: (id, reason) =>
      call({ route: teacherEarningRoutes.void, params: { id }, body: { reason } }),
    receiptUploadUrl: (teacherId, body) =>
      call({ route: teacherEarningRoutes.receiptUploadUrl, params: { teacherId }, body }),
  };
}
