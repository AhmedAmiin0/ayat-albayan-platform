import type { RouteBody, RouteResult } from '@ab/core';
import type { SubscriptionCancel } from '@ab/money';
import type { salesSubscribeRoutes } from '@ab/shared';

type Routes = typeof salesSubscribeRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export type SalesQuoteBody = RouteBody<Routes['quote']>;
export type SalesSubscriptionBody = RouteBody<Routes['create']>;

export interface SalesSubscriptionCancel {
  subscriptionId: string;
  body: SubscriptionCancel;
}

export interface SalesSubscribeCalls {
  teachers: () => Answer<'teachers'>;
  quote: (body: SalesQuoteBody) => Answer<'quote'>;
  create: (body: SalesSubscriptionBody) => Answer<'create'>;
  cancel: (input: SalesSubscriptionCancel) => Answer<'cancel'>;
}
