import type { RouteBody, RouteQuery, RouteResult } from '@ab/core';
import type { paymentRoutes } from '@ab/shared';

type Routes = typeof paymentRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export type PaymentListQuery = RouteQuery<Routes['list']>;
export type PaymentCreateBody = RouteBody<Routes['create']>;
export type PaymentUpdateBody = RouteBody<Routes['update']>;
export type ReceiptUploadBody = RouteBody<Routes['receiptUploadUrl']>;

export interface PaymentCalls {
  list: (query: PaymentListQuery) => Answer<'list'>;
  create: (body: PaymentCreateBody) => Answer<'create'>;
  receiptUploadUrl: (body: ReceiptUploadBody) => Answer<'receiptUploadUrl'>;
  get: (id: string) => Answer<'get'>;
  receipt: (id: string) => Answer<'receipt'>;
  attachments: (id: string) => Answer<'attachments'>;
  update: (id: string, body: PaymentUpdateBody) => Answer<'update'>;
  remove: (id: string) => Answer<'remove'>;
}
