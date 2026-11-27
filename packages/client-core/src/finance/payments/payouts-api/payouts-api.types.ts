import type { RouteBody, RouteResult } from '@ab/core';
import type { myPayoutRoutes, payoutRoutes } from '@ab/shared';

type Admin = typeof payoutRoutes;
type Answer<K extends keyof Admin> = Promise<RouteResult<Admin[K]>>;

export type PayoutPayBody = RouteBody<Admin['pay']>;

export interface PayoutCalls {
  month: (month: string) => Answer<'month'>;
  mine: () => Promise<RouteResult<(typeof myPayoutRoutes)['mine']>>;
  generate: (month: string) => Answer<'generate'>;
  approve: (id: string) => Answer<'approve'>;
  reopen: (id: string) => Answer<'reopen'>;
  unpay: (id: string, reason: string) => Answer<'unpay'>;
  pay: (id: string, body: PayoutPayBody) => Answer<'pay'>;
  receipt: (id: string) => Answer<'receipt'>;
}
