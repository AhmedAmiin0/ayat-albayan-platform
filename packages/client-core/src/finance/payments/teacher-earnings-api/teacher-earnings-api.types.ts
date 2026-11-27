import type { RouteBody, RouteQuery, RouteResult } from '@ab/core';
import type { myEarningRoutes, teacherEarningRoutes } from '@ab/shared';

type Admin = typeof teacherEarningRoutes;
type Answer<K extends keyof Admin> = Promise<RouteResult<Admin[K]>>;
/** A teacher's id for an admin read; undefined reads the signed-in teacher's own. */
export type EarningsOwner = string | undefined;

export type SessionsQuery = RouteQuery<(typeof myEarningRoutes)['sessions']>;
export type PaymentsQuery = RouteQuery<(typeof myEarningRoutes)['payments']>;

export interface TeacherEarningCalls {
  summary: () => Answer<'summary'>;
  balance: (owner: EarningsOwner) => Answer<'balance'>;
  sessions: (owner: EarningsOwner, query: SessionsQuery) => Answer<'sessions'>;
  payments: (owner: EarningsOwner, query: PaymentsQuery) => Answer<'payments'>;
  receipt: (owner: EarningsOwner, paymentId: string) => Answer<'receipt'>;
  record: (teacherId: string, body: RouteBody<Admin['record']>) => Answer<'record'>;
  voidPayment: (paymentId: string, reason: string) => Answer<'void'>;
  receiptUploadUrl: (
    teacherId: string,
    body: RouteBody<Admin['receiptUploadUrl']>,
  ) => Answer<'receiptUploadUrl'>;
}
