import { myEarningRoutes as mine, teacherEarningRoutes as admin } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type {
  EarningsOwner,
  PaymentsQuery,
  SessionsQuery,
  TeacherEarningCalls,
} from './teacher-earnings-api.types';

const isMine = (owner: EarningsOwner): owner is undefined => owner === undefined;

function readers(call: ReturnType<typeof callWith>) {
  return {
    balance: (owner: EarningsOwner) =>
      isMine(owner)
        ? call({ route: mine.balance })
        : call({ route: admin.balance, params: { teacherId: owner } }),
    sessions: (owner: EarningsOwner, query: SessionsQuery) =>
      isMine(owner)
        ? call({ route: mine.sessions, query })
        : call({ route: admin.sessions, params: { teacherId: owner }, query }),
    payments: (owner: EarningsOwner, query: PaymentsQuery) =>
      isMine(owner)
        ? call({ route: mine.payments, query })
        : call({ route: admin.payments, params: { teacherId: owner }, query }),
    receipt: (owner: EarningsOwner, id: string) =>
      call({ route: isMine(owner) ? mine.receipt : admin.receipt, params: { id } }),
  };
}

/** Teacher earnings on one api client: an admin names the teacher, a teacher reads their own. */
export function teacherEarningCalls(client: ApiClient): TeacherEarningCalls {
  const call = callWith(client);
  return {
    ...readers(call),
    summary: () => call({ route: admin.summary }),
    record: (teacherId, body) => call({ route: admin.record, params: { teacherId }, body }),
    voidPayment: (id, reason) => call({ route: admin.void, params: { id }, body: { reason } }),
    receiptUploadUrl: (teacherId, body) =>
      call({ route: admin.receiptUploadUrl, params: { teacherId }, body }),
  };
}
