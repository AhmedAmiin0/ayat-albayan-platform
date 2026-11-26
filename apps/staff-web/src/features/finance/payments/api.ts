import { signedDownloadSchema, type SignedUpload } from '@ab/shared';
import type { PaymentKind, PaymentMethod } from '@ab/catalog';
import { paymentAttachmentListSchema, paymentsPageSchema, paymentViewSchema } from '@ab/money';
import { RIYADH_TZ, riyadhToday, wallInstant } from '@ab/time';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { sortFilterParams, type SortSearch } from '@/lib/list/list-search';
import { uploadSigned } from '@/lib/storage/upload-slot';
import { PAGE_SIZE } from '@/features/finance/subscriptions/api';
import { financeFileKeys, moneyKeys } from '@/features/finance/keys';

// apps/api/src/modules/payments (docs/11 §7, R-PAY-01).
export type { PaymentView } from '@ab/money';

/** The payments page filters (all optional); from/to are Riyadh days, inclusive. */
export type PaymentFilters = {
  studentId?: string;
  from?: string;
  to?: string;
  method?: PaymentMethod;
  kind?: PaymentKind;
};

/** Only the set filters, as query parameters (shared by the list and its CSV). */
export function filterParams(f: PaymentFilters): Record<string, string> {
  return Object.fromEntries(
    Object.entries(f).filter((e): e is [string, string] => typeof e[1] === 'string' && e[1] !== ''),
  );
}

/** GET /payments: one page, filtered and (R-NFR-08) sorted server-side; default newest paid first. */
export const paymentsQuery = (page: number, filters: PaymentFilters = {}, sort: SortSearch = {}) =>
  queryOptions({
    queryKey: moneyKeys.payments({ page, filters, sort }),
    queryFn: () => {
      const qs = new URLSearchParams([
        ...Object.entries(filterParams(filters)),
        ...sortFilterParams(sort),
      ]);
      qs.set('page', String(page));
      qs.set('pageSize', String(PAGE_SIZE));
      return apiFetch(`/payments?${qs}`, { schema: paymentsPageSchema });
    },
    placeholderData: keepPreviousData,
  });

export type PaymentPatch = {
  amount?: number;
  method?: PaymentMethod;
  paidAt?: string;
  note?: string | null;
};

/** PATCH /payments/:id (audited; the package status is recomputed). */
export const updatePayment = (id: string, patch: PaymentPatch) =>
  apiSend('PATCH', `/payments/${id}`, { body: patch, schema: paymentViewSchema });

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
  /** Bank only, 0 to 5 uploaded paths; otherwise 400 attachments_not_allowed. */
  attachments?: string[];
  note: string | null;
  /** One per payment form, re-sent on retries (the API returns the payment it already recorded). */
  clientRequestId: string;
};

export const recordPayment = (body: RecordPaymentBody) =>
  apiSend('POST', '/payments', { body, schema: paymentViewSchema });

export const receiptUrl = (paymentId: string) =>
  apiFetch(`/payments/${paymentId}/receipt`, { schema: signedDownloadSchema });

/** Signed for 1 h. */
export const attachmentsQuery = (path: string) =>
  queryOptions({
    queryKey: financeFileKeys.attachments(path),
    queryFn: () => apiFetch(path, { schema: paymentAttachmentListSchema }),
    staleTime: 30 * 60_000,
  });

/**
 * The receipt goes straight to the private bucket through a one-off signed URL (P6), then its
 * path is registered with the payment (P2 checks it belongs to the package and exists).
 */
export async function uploadReceipt(input: {
  subscriptionId: string;
  file: File;
}): Promise<string> {
  const { file } = input;
  const signed = await apiSend<SignedUpload>('POST', '/payments/receipt-upload-url', {
    subscriptionId: input.subscriptionId,
    mime: file.type,
    size: file.size,
  });
  const { error } = await uploadSigned(signed, { body: file, contentType: file.type });
  if (error) throw error;
  return signed.path;
}

/** Today → now; an earlier day → noon Riyadh on that day (never in the future: paid_at_future). */
export function paidAtFor(day: string, now = new Date()): string {
  // academy day (docs/34 b): a payment day is a Riyadh day, stored at its noon
  const today = riyadhToday(now);
  return day >= today ? now.toISOString() : wallInstant(day, '12:00', RIYADH_TZ).toISOString();
}
