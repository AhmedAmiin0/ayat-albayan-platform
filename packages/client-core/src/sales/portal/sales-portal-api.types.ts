import type { RouteResult } from '@ab/core';
import type { SalesSubscriptionKind, salesPortalRoutes } from '@ab/shared';

type Subscriptions = (typeof salesPortalRoutes)['subscriptions'];

export interface SalesPortalCalls {
  subscriptions: (kind: SalesSubscriptionKind) => Promise<RouteResult<Subscriptions>>;
}
