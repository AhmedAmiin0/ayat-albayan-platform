import type { RouteQuery, RouteResult } from '@ab/core';
import type { myEarningRoutes } from '@ab/shared';

type Mine = typeof myEarningRoutes;
type Answer<K extends keyof Mine> = Promise<RouteResult<Mine[K]>>;

export interface MyEarningCalls {
  balance: () => Answer<'balance'>;
  sessions: (query: RouteQuery<Mine['sessions']>) => Answer<'sessions'>;
  payments: (query: RouteQuery<Mine['payments']>) => Answer<'payments'>;
  receipt: (paymentId: string) => Answer<'receipt'>;
}
