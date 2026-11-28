import { myEarningRoutes, teacherEarningRoutes } from '@ab/shared';
import { routePath, type Page } from '@ab/core';
import {
  teacherReceiptUploadSchema,
  type TeacherEarningView,
  type TeacherPaymentView,
} from '@ab/money';
import { myEarningCalls, teacherEarningCalls, type SessionFilter } from '@ab/client-core';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { moneyKeys } from '@/features/finance/keys';
import { apiFetch, apiSend } from '@ab/web-kit';
import { sortFilterParams, type FilterSearch, type SortSearch } from '@/lib/list/list-search';
import { uploadSigned } from '@/lib/storage/upload-slot';

// apps/api/src/modules/teacher-earnings (docs/11 §10). Teacher money is EGP.
export type { TeacherEarningsBalanceView, TeacherEarningView, TeacherPaymentView } from '@ab/money';

export const EARNINGS_PAGE_SIZE = 20;
/** Admin reads one teacher by id; a teacher always reads their own (id from the token). */
export type Scope = { kind: 'admin'; teacherId: string } | { kind: 'mine' };

const client = { apiFetch, apiSend };
const calls = teacherEarningCalls(client);
const mine = myEarningCalls(client);
const listPath = (s: Scope, list: 'sessions' | 'payments') =>
  s.kind === 'admin'
    ? routePath(teacherEarningRoutes[list], { teacherId: s.teacherId })
    : routePath(myEarningRoutes[list]);
const owner = (s: Scope) => (s.kind === 'admin' ? s.teacherId : 'me');
export const earningsKey = (s: Scope) => moneyKeys.earnings(owner(s));

export const balanceQuery = (s: Scope) =>
  queryOptions({
    queryKey: moneyKeys.earningsBalance(owner(s)),
    queryFn: () => (s.kind === 'admin' ? calls.balance(s.teacherId) : mine.balance()),
  });

/** One page of sessions, sorted server-side (R-NFR-08); no sort = newest first. */
export const sessionsQuery = (
  s: Scope,
  q: { status: SessionFilter; page: number; sort?: SortSearch },
) =>
  queryOptions({
    queryKey: moneyKeys.earningsSessions(owner(s), q),
    queryFn: () => {
      const qs = new URLSearchParams(sortFilterParams(q.sort ?? {}));
      qs.set('page', String(q.page));
      qs.set('pageSize', String(EARNINGS_PAGE_SIZE));
      if (q.status !== 'all') qs.set('status', q.status);
      return apiFetch<Page<TeacherEarningView>>(`${listPath(s, 'sessions')}?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

export interface PaymentsList {
  page: number;
  sort?: SortSearch;
  filters?: FilterSearch;
}

/** One page of payments, sorted and filtered server-side; no sort = newest first. */
export const paymentsQuery = (s: Scope, q: PaymentsList) =>
  queryOptions({
    queryKey: moneyKeys.earningsPayments(owner(s), q),
    queryFn: () => {
      const qs = new URLSearchParams(sortFilterParams(q.sort ?? {}, q.filters));
      qs.set('page', String(q.page));
      qs.set('pageSize', String(EARNINGS_PAGE_SIZE));
      return apiFetch<Page<TeacherPaymentView>>(`${listPath(s, 'payments')}?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

export const payTeacher = calls.record;

/** A wrong transfer is voided with a reason (admin); it stays in the history struck through. */
export const voidTeacherPayment = calls.voidPayment;

export const receiptUrl = (s: Scope, paymentId: string) =>
  s.kind === 'admin' ? calls.receipt(paymentId) : mine.receipt(paymentId);

/** To the private bucket through a one-off signed URL; the path then goes with the payment. */
export async function uploadTeacherReceipt(input: {
  teacherId: string;
  file: File;
}): Promise<string> {
  const { file } = input;
  const slot = teacherReceiptUploadSchema.parse({ mime: file.type, size: file.size });
  const signed = await calls.receiptUploadUrl(input.teacherId, slot);
  const { error } = await uploadSigned(signed, { body: file, contentType: file.type });
  if (error) throw error;
  return signed.path;
}
