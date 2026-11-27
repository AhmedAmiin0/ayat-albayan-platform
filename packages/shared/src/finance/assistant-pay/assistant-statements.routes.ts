import { defineRoute, id } from '@ab/core';
import {
  assistantReasonSchema,
  assistantStatementGenerateSchema,
  assistantStatementListSchema,
  assistantStatementPaySchema,
  assistantStatementsQuery,
  assistantStatementViewSchema,
  teacherReceiptUploadSchema,
} from '@ab/money';
import { z } from 'zod';
import { signedDownloadSchema, signedUploadSchema } from '../../reports';
import { emptyWhenMissing } from '../empty-when-missing';

const byId = z.object({ id: id() });

/** The receipt of a statement's payment: the same files as teacher receipts. */
export const assistantReceiptUploadSchema = teacherReceiptUploadSchema.extend({
  assistantId: z.uuid(),
});

/**
 * The assistants' monthly statements (R-ASST-03, R-ASST-05): draft -> approved -> paid, salary,
 * commissions and adjustments per currency.
 */
export const assistantStatementRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/assistant-pay/statements',
    query: assistantStatementsQuery,
    response: assistantStatementListSchema,
  }),
  get: defineRoute({
    method: 'GET',
    path: '/assistant-pay/statements/:id',
    params: byId,
    response: assistantStatementViewSchema,
  }),
  receipt: defineRoute({
    method: 'GET',
    path: '/assistant-pay/statements/:id/receipt',
    params: byId,
    response: signedDownloadSchema,
  }),
  generate: defineRoute({
    method: 'POST',
    path: '/assistant-pay/statements',
    body: assistantStatementGenerateSchema,
    response: assistantStatementViewSchema,
  }),
  approve: defineRoute({
    method: 'POST',
    path: '/assistant-pay/statements/:id/approve',
    params: byId,
    response: assistantStatementViewSchema,
  }),
  reopen: defineRoute({
    method: 'POST',
    path: '/assistant-pay/statements/:id/reopen',
    params: byId,
    response: assistantStatementViewSchema,
  }),
  pay: defineRoute({
    method: 'POST',
    path: '/assistant-pay/statements/:id/pay',
    params: byId,
    body: emptyWhenMissing(assistantStatementPaySchema),
    response: assistantStatementViewSchema,
  }),
  unpay: defineRoute({
    method: 'POST',
    path: '/assistant-pay/statements/:id/unpay',
    params: byId,
    body: emptyWhenMissing(assistantReasonSchema),
    response: assistantStatementViewSchema,
  }),
  receiptUploadUrl: defineRoute({
    method: 'POST',
    path: '/assistant-pay/receipt-upload-url',
    body: assistantReceiptUploadSchema,
    response: signedUploadSchema,
  }),
};
