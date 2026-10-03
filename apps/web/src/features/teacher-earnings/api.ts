import type {
  PaymentMethod,
  SignedDownload,
  SignedUpload,
  TeacherEarningsBalanceView,
  TeacherEarningView,
  TeacherPaymentResult,
  TeacherPaymentView,
} from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { MONEY_KEY, type Page } from '@/features/subscriptions/api';
import { apiFetch, apiSend } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// apps/api/src/modules/teacher-earnings (docs/11 §10). Teacher money is EGP.
export type { TeacherEarningsBalanceView, TeacherEarningView, TeacherPaymentView } from '@ab/shared';

export const EARNINGS_PAGE_SIZE = 20;
/** Admin reads one teacher by id; a teacher always reads their own (the id comes from the token). */
export type Scope = { kind: 'admin'; teacherId: string } | { kind: 'mine' };
export type SessionFilter = 'all' | 'unpaid' | 'paid';

const base = (s: Scope) => (s.kind === 'admin' ? `/teacher-earnings/${s.teacherId}` : '/teachers/me/earnings');
export const earningsKey = (s: Scope) => [...MONEY_KEY, 'teacher-earnings', s.kind === 'admin' ? s.teacherId : 'me'] as const;

export const balanceQuery = (s: Scope) =>
  queryOptions({ queryKey: [...earningsKey(s), 'balance'], queryFn: () => apiFetch<TeacherEarningsBalanceView>(base(s)) });

export const sessionsQuery = (s: Scope, q: { status: SessionFilter; page: number }) =>
  queryOptions({
    queryKey: [...earningsKey(s), 'sessions', q],
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(q.page), pageSize: String(EARNINGS_PAGE_SIZE) });
      if (q.status !== 'all') qs.set('status', q.status);
      return apiFetch<Page<TeacherEarningView>>(`${base(s)}/sessions?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

export const paymentsQuery = (s: Scope, page: number) =>
  queryOptions({
    queryKey: [...earningsKey(s), 'payments', page],
    queryFn: () => apiFetch<Page<TeacherPaymentView>>(`${base(s)}/payments?page=${page}&pageSize=${EARNINGS_PAGE_SIZE}`),
    placeholderData: keepPreviousData,
  });

export type PayBody = {
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  earningIds?: string[];
  receiptPath: string | null;
  note: string | null;
  /** One per pay dialog, re-sent on retries (the API returns the payment it already recorded). */
  clientRequestId: string;
};

export const payTeacher = (teacherId: string, body: PayBody) =>
  apiSend<TeacherPaymentResult>('POST', `/teacher-earnings/${teacherId}/payments`, body);

export const receiptUrl = (s: Scope, paymentId: string) =>
  apiFetch<SignedDownload>(s.kind === 'admin' ? `/teacher-earnings/payments/${paymentId}/receipt` : `${base(s)}/payments/${paymentId}/receipt`);

/** Straight to the private bucket through a one-off signed URL; the path is then sent with the payment. */
export async function uploadTeacherReceipt(input: { teacherId: string; file: File }): Promise<string> {
  const { file } = input;
  const signed = await apiSend<SignedUpload>('POST', `/teacher-earnings/${input.teacherId}/receipt-upload-url`, {
    mime: file.type,
    size: file.size,
  });
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
  if (error) throw error;
  return signed.path;
}
