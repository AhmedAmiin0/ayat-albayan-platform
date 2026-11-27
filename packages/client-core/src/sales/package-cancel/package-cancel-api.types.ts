import type { RouteResult } from '@ab/core';
import type { SubscriptionCancel } from '@ab/money';
import type { salesPackageCancelRoutes } from '@ab/shared';

type Answer<K extends keyof typeof salesPackageCancelRoutes> = Promise<
  RouteResult<(typeof salesPackageCancelRoutes)[K]>
>;

export interface SalesPackageCancelRequest {
  subscriptionId: string;
  body: SubscriptionCancel;
}

export interface SalesPackageCancelCalls {
  check: (subscriptionId: string) => Answer<'check'>;
  cancel: (input: SalesPackageCancelRequest) => Answer<'cancel'>;
}
