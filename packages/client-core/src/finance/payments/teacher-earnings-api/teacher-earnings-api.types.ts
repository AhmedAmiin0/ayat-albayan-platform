import type { RouteBody, RouteQuery, RouteResult } from '@ab/core';
import type { teacherEarningRoutes } from '@ab/shared';

type Admin = typeof teacherEarningRoutes;
type Answer<K extends keyof Admin> = Promise<RouteResult<Admin[K]>>;

export type SessionsQuery = RouteQuery<Admin['sessions']>;
export type PaymentsQuery = RouteQuery<Admin['payments']>;

export interface TeacherEarningCalls {
  summary: () => Answer<'summary'>;
  balance: (teacherId: string) => Answer<'balance'>;
  sessions: (teacherId: string, query: SessionsQuery) => Answer<'sessions'>;
  payments: (teacherId: string, query: PaymentsQuery) => Answer<'payments'>;
  receipt: (paymentId: string) => Answer<'receipt'>;
  record: (teacherId: string, body: RouteBody<Admin['record']>) => Answer<'record'>;
  voidPayment: (paymentId: string, reason: string) => Answer<'void'>;
  receiptUploadUrl: (
    teacherId: string,
    body: RouteBody<Admin['receiptUploadUrl']>,
  ) => Answer<'receiptUploadUrl'>;
}
