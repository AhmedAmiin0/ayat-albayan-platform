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

const byId = z.object({ id: id() });
/** A POST sent without a body reads as `{}`, as the handlers took it before the routes moved. */
const emptyWhenMissing = <S extends z.ZodType>(schema: S) => z.preprocess((v) => v ?? {}, schema);
const byTeacher = z.object({ teacherId: id() });
const sessionsPage = pageOf(teacherEarningViewSchema);
const paymentsPage = pageOf(teacherPaymentViewSchema);

/**
 * Admin: every teacher's dues and one teacher's balance, sessions and payments (docs/11 §10).
 * The static segments come before `:teacherId`, the order the api registers them in.
 */
export const teacherEarningRoutes = {
  summary: defineRoute({
    method: 'GET',
    path: '/teacher-earnings/summary',
    response: teacherEarningsSummaryViewSchema,
  }),
  resync: defineRoute({
    method: 'POST',
    path: '/teacher-earnings/resync',
    body: emptyWhenMissing(teacherResyncSchema),
    response: z.object({ lessons: z.number().int() }),
  }),
  void: defineRoute({
    method: 'POST',
    path: '/teacher-earnings/payments/:id/void',
    params: byId,
    body: emptyWhenMissing(voidReasonSchema),
    response: teacherPaymentViewSchema,
  }),
  receipt: defineRoute({
    method: 'GET',
    path: '/teacher-earnings/payments/:id/receipt',
    params: byId,
    response: signedDownloadSchema,
  }),
  balance: defineRoute({
    method: 'GET',
    path: '/teacher-earnings/:teacherId',
    params: byTeacher,
    response: teacherEarningsBalanceViewSchema,
  }),
  sessions: defineRoute({
    method: 'GET',
    path: '/teacher-earnings/:teacherId/sessions',
    params: byTeacher,
    query: earningsListQuery,
    response: sessionsPage,
  }),
  payments: defineRoute({
    method: 'GET',
    path: '/teacher-earnings/:teacherId/payments',
    params: byTeacher,
    query: teacherPaymentListQuery,
    response: paymentsPage,
  }),
  record: defineRoute({
    method: 'POST',
    path: '/teacher-earnings/:teacherId/payments',
    params: byTeacher,
    body: teacherPaymentCreateSchema,
    response: teacherPaymentResultSchema,
  }),
  receiptUploadUrl: defineRoute({
    method: 'POST',
    path: '/teacher-earnings/:teacherId/receipt-upload-url',
    params: byTeacher,
    body: teacherReceiptUploadSchema,
    response: signedUploadSchema,
  }),
};

/** The signed-in teacher's own earnings: the teacher comes from the token, never the path. */
export const myEarningRoutes = {
  balance: defineRoute({
    method: 'GET',
    path: '/teachers/me/earnings',
    response: teacherEarningsBalanceViewSchema,
  }),
  sessions: defineRoute({
    method: 'GET',
    path: '/teachers/me/earnings/sessions',
    query: earningsListQuery,
    response: sessionsPage,
  }),
  payments: defineRoute({
    method: 'GET',
    path: '/teachers/me/earnings/payments',
    query: teacherPaymentListQuery,
    response: paymentsPage,
  }),
  receipt: defineRoute({
    method: 'GET',
    path: '/teachers/me/earnings/payments/:id/receipt',
    params: byId,
    response: signedDownloadSchema,
  }),
};
