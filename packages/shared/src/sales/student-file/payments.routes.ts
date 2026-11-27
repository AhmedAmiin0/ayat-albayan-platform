import { defineRoute, id } from '@ab/core';
import { paymentAmountSchema } from '@ab/money';
import { z } from 'zod';
import { signedUploadSchema } from '../../reports';
import {
  salesChatReceiptCopySchema,
  salesPaymentCreateSchema,
  salesReceiptUploadSchema,
} from '../money';
import { salesPaymentViewSchema, salesReceiptCopiedSchema } from './subscribe.schemas';

const ACCESS = { permissions: ['self.sales_money'], tags: ['sales'] } as const;

/**
 * Her bank transfer from a sales chat, counted at once (R-ASST-04, docs/16 rows 17-19): no
 * delete or refund; a receipt only under her student's package, or with sales.renew_any the
 * child the chat `phone` names.
 */
export const salesPaymentRoutes = {
  /** A replay with the same clientRequestId answers the payment already recorded. */
  create: defineRoute({
    ...ACCESS,
    method: 'POST',
    path: '/sales/payments',
    body: salesPaymentCreateSchema,
    response: salesPaymentViewSchema,
  }),
  /** A signed PUT for receipts/{subscription_id}/{uuid}.{ext}. */
  receiptUploadUrl: defineRoute({
    ...ACCESS,
    method: 'POST',
    path: '/sales/payments/receipt-upload-url',
    body: salesReceiptUploadSchema,
    response: signedUploadSchema,
  }),
  receiptFromChat: defineRoute({
    ...ACCESS,
    method: 'POST',
    path: '/sales/payments/receipt-from-chat',
    body: salesChatReceiptCopySchema,
    response: salesReceiptCopiedSchema,
  }),
  /** Needs subscriptions.edit_terms, never payments.write; 409 stripe_amount_locked on a card. */
  editAmount: defineRoute({
    permissions: ['subscriptions.edit_terms'],
    tags: ['sales'],
    method: 'PATCH',
    path: '/sales/payments/:id/amount',
    params: z.object({ id: id() }),
    body: paymentAmountSchema,
    response: salesPaymentViewSchema,
  }),
};
