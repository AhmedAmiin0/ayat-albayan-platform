import type { RouteBody, RouteQuery, RouteResult } from '@ab/core';
import type { paymentLinkRoutes } from '@ab/shared';

type Routes = typeof paymentLinkRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export type PaymentLinkQuoteBody = RouteBody<Routes['quote']>;
export type PaymentLinkCreateBody = RouteBody<Routes['create']>;
export type PaymentLinkListQuery = RouteQuery<Routes['list']>;

export interface PaymentLinkCalls {
  quote: (body: PaymentLinkQuoteBody) => Answer<'quote'>;
  create: (body: PaymentLinkCreateBody) => Answer<'create'>;
  list: (query?: PaymentLinkListQuery) => Answer<'list'>;
  cancel: (id: string) => Answer<'cancel'>;
}
