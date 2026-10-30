import type { PaymentAttachmentView, PaymentKind, PaymentMethod, PaymentView, SignedDownload, SignedUpload } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';
import { sortFilterParams, type SortSearch } from '@/lib/list/list-search';
import { supabase } from '@/lib/http/supabase';
import { MONEY_KEY, PAGE_SIZE, type Page } from '@/features/finance/subscriptions/api';

// apps/api/src/modules/payments (docs/11 §7, R-PAY-01).
export type { PaymentView } from '@ab/shared';

/** The payments page filters (all optional); from/to are Riyadh days, inclusive. */
export type PaymentFilters = { studentId?: string; from?: string; to?: string; method?: PaymentMethod; kind?: PaymentKind };
export type PeriodTotal = { currency: string; net: number; payments: number; refunds: number };

/** Only the set filters, as query parameters (shared by the list and its CSV). */
export function filterParams(f: PaymentFilters): Record<string, string> {
  return Object.fromEntries(Object.entries(f).filter((e): e is [string, string] => typeof e[1] === 'string' && e[1] !== ''));
}

/** GET /payments: one page, filtered and (R-NFR-08) sorted server-side; default newest paid first. */
export const paymentsQuery = (page: number, filters: PaymentFilters = {}, sort: SortSearch = {}) =>
  queryOptions({
    queryKey: [...MONEY_KEY, 'payments', page, filters, sort],
    queryFn: () => {
      const qs = new URLSearchParams([...Object.entries(filterParams(filters)), ...sortFilterParams(sort)]);
      qs.set('page', String(page));
      qs.set('pageSize', String(PAGE_SIZE));
      return apiFetch<Page<PaymentView> & { totals: PeriodTotal[] }>(`/payments?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

export type PaymentPatch = { amount?: number; method?: PaymentMethod; paidAt?: string; note?: string | null };

/** PATCH /payments/:id (audited; the package status is recomputed). */
export const updatePayment = (id: string, patch: PaymentPatch) => apiSend<PaymentView>('PATCH', `/payments/${id}`, patch);

/** DELETE /payments/:id (audited; the receipt is removed). */
export const deletePayment = (id: string) => apiSend('DELETE', `/payments/${id}`);

export type RecordPaymentBody = {
  subscriptionId: string;
  amount: number;
  currency: string;
  kind: PaymentKind;
  invoiceId?: string;
  method: PaymentMethod;
  paidAt: string;
  receiptPath: string | null;
  /** «المرفقات» (bank only, 0..5 uploaded paths); the API answers 400 attachments_not_allowed otherwise. */
  attachments?: string[];
  note: string | null;
  /** One per payment form, re-sent on retries (the API returns the payment it already recorded). */
  clientRequestId: string;
};

export const recordPayment = (body: RecordPaymentBody) => apiSend<PaymentView>('POST', '/payments', body);

export const receiptUrl = (paymentId: string) => apiFetch<SignedDownload>(`/payments/${paymentId}/receipt`);

/** A payment's «المرفقات», signed for 1 h: GET /payments/:id/attachments or /sales/me/payments/:id/attachments. */
export const attachmentsQuery = (path: string) =>
  queryOptions({
    queryKey: ['payment-attachments', path],
    queryFn: () => apiFetch<PaymentAttachmentView[]>(path),
    staleTime: 30 * 60_000,
  });

/**
 * The receipt goes straight to the private bucket through a one-off signed URL (P6), then its
 * path is registered with the payment (P2 checks it belongs to the package and exists).
 */
export async function uploadReceipt(input: { subscriptionId: string; file: File }): Promise<string> {
  const { file } = input;
  const signed = await apiSend<SignedUpload>('POST', '/payments/receipt-upload-url', {
    subscriptionId: input.subscriptionId,
    mime: file.type,
    size: file.size,
  });
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
  if (error) throw error;
  return signed.path;
}

/** Today → now; an earlier day → noon Riyadh on that day (never in the future: paid_at_future). */
export function paidAtFor(day: string, now = new Date()): string {
  // academy day (docs/34 b): a payment day is a Riyadh day, stored at its noon
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
  return day >= today ? now.toISOString() : new Date(`${day}T12:00:00+03:00`).toISOString();
}
