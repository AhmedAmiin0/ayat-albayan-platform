import { defineRoute, id, pageOf, pageQuery } from '@ab/core';
import {
  myCommissionRowSchema,
  myEarningsSchema,
  myPaymentRowSchema,
  myStudentRowSchema,
  paymentAttachmentListSchema,
} from '@ab/money';
import { z } from 'zod';

const ownStudents = { permissions: ['self.sales_students'], tags: ['sales'] } as const;
const ownEarnings = { permissions: ['self.sales_earnings'], tags: ['sales'] } as const;
const ownPayments = { permissions: ['self.sales_payments'], tags: ['sales'] } as const;

/**
 * The assistant's own read-only pages (R-ASST-04, R-ASST-06): always the caller's own rows,
 * whatever the query says.
 */
export const mySalesRoutes = {
  students: defineRoute({
    method: 'GET',
    path: '/sales/me/students',
    response: z.array(myStudentRowSchema),
    ...ownStudents,
  }),
  earnings: defineRoute({
    method: 'GET',
    path: '/sales/me/earnings',
    response: myEarningsSchema,
    ...ownEarnings,
  }),
  commissions: defineRoute({
    method: 'GET',
    path: '/sales/me/commissions',
    query: z.object(pageQuery({ size: 25 })),
    response: pageOf(myCommissionRowSchema),
    ...ownEarnings,
  }),
  payments: defineRoute({
    method: 'GET',
    path: '/sales/me/payments',
    response: z.array(myPaymentRowSchema),
    ...ownPayments,
  }),
  paymentAttachments: defineRoute({
    method: 'GET',
    path: '/sales/me/payments/:id/attachments',
    params: z.object({ id: id() }),
    response: paymentAttachmentListSchema,
    ...ownPayments,
  }),
};
