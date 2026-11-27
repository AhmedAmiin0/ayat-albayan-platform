import { defineRoute, id, pageOf, pageQuery } from '@ab/core';
import {
  myCommissionRowSchema,
  myEarningsSchema,
  myPaymentRowSchema,
  myStudentRowSchema,
  paymentAttachmentListSchema,
} from '@ab/money';
import { z } from 'zod';

/**
 * The assistant's own read-only pages (R-ASST-04, R-ASST-06): always the caller's own rows,
 * whatever the query says.
 */
export const mySalesRoutes = {
  students: defineRoute({
    method: 'GET',
    path: '/sales/me/students',
    response: z.array(myStudentRowSchema),
  }),
  earnings: defineRoute({
    method: 'GET',
    path: '/sales/me/earnings',
    response: myEarningsSchema,
  }),
  commissions: defineRoute({
    method: 'GET',
    path: '/sales/me/commissions',
    query: z.object(pageQuery({ size: 25 })),
    response: pageOf(myCommissionRowSchema),
  }),
  payments: defineRoute({
    method: 'GET',
    path: '/sales/me/payments',
    response: z.array(myPaymentRowSchema),
  }),
  paymentAttachments: defineRoute({
    method: 'GET',
    path: '/sales/me/payments/:id/attachments',
    params: z.object({ id: id() }),
    response: paymentAttachmentListSchema,
  }),
};
