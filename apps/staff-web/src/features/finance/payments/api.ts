import {
  paymentCalls,
  type PaymentCreateBody,
  type PaymentListQuery,
  type PaymentUpdateBody,
} from '@ab/client-core';
import type { PaymentKind } from '@ab/catalog';
import {
  PAYMENT_SORT_KEYS,
  paymentAttachmentListSchema,
  receiptUploadSchema,
} from '@ab/money';
import { RIYADH_TZ, riyadhToday, wallInstant } from '@ab/time';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { z } from 'zod';
import type { SortSearch } from '@/lib/list/list-search';
import { uploadSigned } from '@/lib/storage/upload-slot';
import { PAGE_SIZE } from '@/features/finance/subscriptions/api';
import { financeFileKeys, moneyKeys } from '@/features/finance/keys';

// apps/api/src/modules/payments (docs/11 §7, R-PAY-01).
export type { PaymentView } from '@ab/money';

const calls = paymentCalls({ apiFetch, apiSend });
const paymentSortKey = z.enum(PAYMENT_SORT_KEYS);

/** The payments page filters (all optional); from/to are Riyadh days, inclusive. */
export type PaymentFilters = {
  studentId?: string;
  from?: string;
  to?: string;
  method?: PaymentListQuery['method'];
  kind?: PaymentKind;
};

/** Only the set filters, as query parameters (shared by the list and its CSV). */
export function filterParams(f: PaymentFilters): Record<string, string> {
  return Object.fromEntries(
    Object.entries(f).filter((e): e is [string, string] => typeof e[1] === 'string' && e[1] !== ''),
  );
}

/** The list query: unset filters left out, `dir` sent only for a descending sort. */
function listQuery(page: number, f: PaymentFilters, s: SortSearch): PaymentListQuery {
  const sort = paymentSortKey.safeParse(s.sort).data;
  const dir = sort && s.dir === 'desc' ? s.dir : undefined;
  const set = (value?: string) => value || undefined;
  const filters = { studentId: set(f.studentId), from: set(f.from), to: set(f.to) };
  return { ...filters, method: f.method, kind: f.kind, sort, dir, page, pageSize: PAGE_SIZE };
}

/** GET /payments: one page, filtered and (R-NFR-08) sorted server-side; default newest paid first. */
export const paymentsQuery = (page: number, filters: PaymentFilters = {}, sort: SortSearch = {}) =>
  queryOptions({
    queryKey: moneyKeys.payments({ page, filters, sort }),
    queryFn: () => calls.list(listQuery(page, filters, sort)),
    placeholderData: keepPreviousData,
  });

export type PaymentPatch = Pick<PaymentUpdateBody, 'amount' | 'method' | 'paidAt' | 'note'>;

/** PATCH /payments/:id (audited; the package status is recomputed). */
export const updatePayment = (id: string, patch: PaymentPatch) => calls.update(id, patch);

/** DELETE /payments/:id (audited; the receipt is removed). */
export const deletePayment = calls.remove;

export type RecordPaymentBody = PaymentCreateBody;

export const recordPayment = calls.create;

export const receiptUrl = calls.receipt;

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
  const mime = receiptUploadSchema.shape.mime.parse(file.type);
  const signed = await calls.receiptUploadUrl({
    subscriptionId: input.subscriptionId,
    mime,
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
