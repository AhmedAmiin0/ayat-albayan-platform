import type { RouteQuery, RouteResult } from '@ab/core';
import type { mySalesRoutes } from '@ab/shared';

type Own = typeof mySalesRoutes;
type Answer<K extends keyof Own> = Promise<RouteResult<Own[K]>>;

export type MyCommissionsQuery = RouteQuery<Own['commissions']>;

export interface MySalesCalls {
  students: () => Answer<'students'>;
  earnings: () => Answer<'earnings'>;
  commissions: (query: MyCommissionsQuery) => Answer<'commissions'>;
  payments: () => Answer<'payments'>;
}
