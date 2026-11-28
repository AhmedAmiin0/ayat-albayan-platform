import { defineRoute, id, pageOf } from '@ab/core';
import {
  earningsListQuery,
  teacherEarningsBalanceViewSchema,
  teacherEarningsSummaryViewSchema,
  teacherEarningViewSchema,
  teacherPaymentCreateSchema,
  teacherPaymentListQuery,
  teacherPaymentResultSchema,
  teacherPaymentViewSchema,
  teacherReceiptUploadSchema,
  teacherResyncSchema,
  voidReasonSchema,
} from '@ab/money';
import { z } from 'zod';
import { signedDownloadSchema, signedUploadSchema } from '../../reports';
import { emptyWhenMissing } from '../empty-when-missing';

const byId = z.object({ id: id() });
const byTeacher = z.object({ teacherId: id() });
const sessionsPage = pageOf(teacherEarningViewSchema);
const paymentsPage = pageOf(teacherPaymentViewSchema);
const read = { permissions: ['earnings.read'], tags: ['teacher-earnings'] } as const;
const write = { permissions: ['earnings.write'], tags: ['teacher-earnings'] } as const;
const ownTeacher = { permissions: ['self.teacher'], tags: ['teachers'] } as const;

/**
 * Admin: every teacher's dues and one teacher's balance, sessions and payments (docs/11 §10).
 * The static segments come before `:teacherId`, the order the api registers them in.
 */
export const teacherEarningRoutes = {
  summary: defineRoute({
    method: 'GET',
    path: '/teacher-earnings/summary',
    response: teacherEarningsSummaryViewSchema,
    ...read,
  }),
  resync: defineRoute({
    method: 'POST',
    path: '/teacher-earnings/resync',
    body: emptyWhenMissing(teacherResyncSchema),
    response: z.object({ lessons: z.number().int() }),
    ...write,
  }),
  void: defineRoute({
    method: 'POST',
    path: '/teacher-earnings/payments/:id/void',
    params: byId,
    body: emptyWhenMissing(voidReasonSchema),
    response: teacherPaymentViewSchema,
    ...write,
  }),
  receipt: defineRoute({
    method: 'GET',
    path: '/teacher-earnings/payments/:id/receipt',
    params: byId,
    response: signedDownloadSchema,
    ...read,
  }),
  balance: defineRoute({
    method: 'GET',
    path: '/teacher-earnings/:teacherId',
    params: byTeacher,
    response: teacherEarningsBalanceViewSchema,
    ...read,
  }),
  sessions: defineRoute({
    method: 'GET',
    path: '/teacher-earnings/:teacherId/sessions',
    params: byTeacher,
    query: earningsListQuery,
    response: sessionsPage,
    ...read,
  }),
  payments: defineRoute({
    method: 'GET',
    path: '/teacher-earnings/:teacherId/payments',
    params: byTeacher,
    query: teacherPaymentListQuery,
    response: paymentsPage,
    ...read,
  }),
  record: defineRoute({
    method: 'POST',
    path: '/teacher-earnings/:teacherId/payments',
    params: byTeacher,
    body: teacherPaymentCreateSchema,
    response: teacherPaymentResultSchema,
    ...write,
  }),
  receiptUploadUrl: defineRoute({
    method: 'POST',
    path: '/teacher-earnings/:teacherId/receipt-upload-url',
    params: byTeacher,
    body: teacherReceiptUploadSchema,
    response: signedUploadSchema,
    ...write,
  }),
};

/** The signed-in teacher's own earnings: the teacher comes from the token, never the path. */
export const myEarningRoutes = {
  balance: defineRoute({
    method: 'GET',
    path: '/teachers/me/earnings',
    response: teacherEarningsBalanceViewSchema,
    ...ownTeacher,
  }),
  sessions: defineRoute({
    method: 'GET',
    path: '/teachers/me/earnings/sessions',
    query: earningsListQuery,
    response: sessionsPage,
    ...ownTeacher,
  }),
  payments: defineRoute({
    method: 'GET',
    path: '/teachers/me/earnings/payments',
    query: teacherPaymentListQuery,
    response: paymentsPage,
    ...ownTeacher,
  }),
  receipt: defineRoute({
    method: 'GET',
    path: '/teachers/me/earnings/payments/:id/receipt',
    params: byId,
    response: signedDownloadSchema,
    ...ownTeacher,
  }),
};
