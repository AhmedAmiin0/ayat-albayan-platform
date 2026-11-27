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
const read = { permissions: ['assistantpay.read'], tags: ['assistant-pay'] } as const;
const write = { permissions: ['assistantpay.write'], tags: ['assistant-pay'] } as const;
const approver = { permissions: ['assistantpay.approve'], tags: ['assistant-pay'] } as const;

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
    ...read,
  }),
  get: defineRoute({
    method: 'GET',
    path: '/assistant-pay/statements/:id',
    params: byId,
    response: assistantStatementViewSchema,
    ...read,
  }),
  receipt: defineRoute({
    method: 'GET',
    path: '/assistant-pay/statements/:id/receipt',
    params: byId,
    response: signedDownloadSchema,
    ...read,
  }),
  generate: defineRoute({
    method: 'POST',
    path: '/assistant-pay/statements',
    body: assistantStatementGenerateSchema,
    response: assistantStatementViewSchema,
    ...write,
  }),
  approve: defineRoute({
    method: 'POST',
    path: '/assistant-pay/statements/:id/approve',
    params: byId,
    response: assistantStatementViewSchema,
    ...approver,
  }),
  reopen: defineRoute({
    method: 'POST',
    path: '/assistant-pay/statements/:id/reopen',
    params: byId,
    response: assistantStatementViewSchema,
    ...approver,
  }),
  pay: defineRoute({
    method: 'POST',
    path: '/assistant-pay/statements/:id/pay',
    params: byId,
    body: emptyWhenMissing(assistantStatementPaySchema),
    response: assistantStatementViewSchema,
    ...write,
  }),
  unpay: defineRoute({
    method: 'POST',
    path: '/assistant-pay/statements/:id/unpay',
    params: byId,
    body: emptyWhenMissing(assistantReasonSchema),
    response: assistantStatementViewSchema,
    ...approver,
  }),
  receiptUploadUrl: defineRoute({
    method: 'POST',
    path: '/assistant-pay/receipt-upload-url',
    body: assistantReceiptUploadSchema,
    response: signedUploadSchema,
    ...write,
  }),
};
