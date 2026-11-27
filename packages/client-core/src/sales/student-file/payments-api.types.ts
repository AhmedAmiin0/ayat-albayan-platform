import type { RouteBody, RouteResult } from '@ab/core';
import type { salesPaymentRoutes } from '@ab/shared';

type Routes = typeof salesPaymentRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export type SalesPaymentBody = RouteBody<Routes['create']>;
export type SalesReceiptUploadBody = RouteBody<Routes['receiptUploadUrl']>;
export type SalesReceiptCopyBody = RouteBody<Routes['receiptFromChat']>;

export interface SalesPaymentAmountEdit {
  paymentId: string;
  amount: number;
}

export interface SalesPaymentCalls {
  create: (body: SalesPaymentBody) => Answer<'create'>;
  receiptUploadUrl: (body: SalesReceiptUploadBody) => Answer<'receiptUploadUrl'>;
  receiptFromChat: (body: SalesReceiptCopyBody) => Answer<'receiptFromChat'>;
  editAmount: (input: SalesPaymentAmountEdit) => Answer<'editAmount'>;
}
