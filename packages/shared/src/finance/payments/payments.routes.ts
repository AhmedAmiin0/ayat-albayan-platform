import { PAYMENT_KINDS, PAYMENT_METHODS } from '@ab/catalog';
import { defineRoute, id, listSortShape, localDate, pageQuery } from '@ab/core';
import {
  PAYMENT_SORT_KEYS,
  paymentAttachmentListSchema,
  paymentCreateSchema,
  paymentsPageSchema,
  paymentUpdateSchema,
  paymentViewSchema,
  receiptUploadSchema,
} from '@ab/money';
import { z } from 'zod';
import { signedDownloadSchema, signedUploadSchema } from '../../reports';

const byId = z.object({ id: id() });
const read = { permissions: ['payments.read'], tags: ['payments'] } as const;
const write = { permissions: ['payments.write'], tags: ['payments'] } as const;

/** Ranges are local days in the academy's zone, inclusive (docs/11 §3). */
export const paymentListQuery = z
  .object(pageQuery({ size: 25 }))
  .extend({
    subscriptionId: z.uuid().optional(),
    studentId: z.uuid().optional(),
    from: localDate.optional(),
    to: localDate.optional(),
    method: z.enum(PAYMENT_METHODS).optional(),
    kind: z.enum(PAYMENT_KINDS).optional(),
    ...listSortShape(PAYMENT_SORT_KEYS),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: 'invalid_range', path: ['to'] });

/** Payments and receipts, admin side (P1–P7, R-PAY-01, R-MOB-02). */
export const paymentRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/payments',
    query: paymentListQuery,
    response: paymentsPageSchema,
    ...read,
  }),
  create: defineRoute({
    method: 'POST',
    path: '/payments',
    body: paymentCreateSchema,
    response: paymentViewSchema,
    ...write,
  }),
  receiptUploadUrl: defineRoute({
    method: 'POST',
    path: '/payments/receipt-upload-url',
    body: receiptUploadSchema,
    response: signedUploadSchema,
    ...write,
  }),
  get: defineRoute({
    method: 'GET',
    path: '/payments/:id',
    params: byId,
    response: paymentViewSchema,
    ...read,
  }),
  receipt: defineRoute({
    method: 'GET',
    path: '/payments/:id/receipt',
    params: byId,
    response: signedDownloadSchema,
    ...read,
  }),
  /** The legacy receipt comes first (id 'receipt'), then the files, signed for 1 hour. */
  attachments: defineRoute({
    method: 'GET',
    path: '/payments/:id/attachments',
    params: byId,
    response: paymentAttachmentListSchema,
    ...read,
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/payments/:id',
    params: byId,
    body: paymentUpdateSchema,
    response: paymentViewSchema,
    ...write,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/payments/:id',
    params: byId,
    response: 'empty',
    ...write,
  }),
};
