import type { RouteResult } from '@ab/core';
import type { salesChatReceiptRoutes } from '@ab/shared';

type Answer<K extends keyof typeof salesChatReceiptRoutes> = Promise<
  RouteResult<(typeof salesChatReceiptRoutes)[K]>
>;

/** `phone`: the chat of a child not hers (sales.renew_any); none for her own student. */
export interface SalesChatScope {
  studentId: string;
  phone?: string;
}

export interface SalesChatReceiptPick extends SalesChatScope {
  messageId: string;
}

export interface SalesChatReceiptCalls {
  list: (input: SalesChatScope) => Answer<'list'>;
  file: (input: SalesChatReceiptPick) => Answer<'file'>;
}
