import type { PaymentMethod, PaymentView, SignedDownload, SignedUpload } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { MONEY_KEY, PAGE_SIZE, type Page } from '@/features/subscriptions/api';

// apps/api/src/modules/payments (docs/11 §7, R-PAY-01).
export type { PaymentView } from '@ab/shared';

export const paymentsQuery = (page: number) =>
  queryOptions({
    queryKey: [...MONEY_KEY, 'payments', page],
    queryFn: () => apiFetch<Page<PaymentView>>(`/payments?page=${page}&pageSize=${PAGE_SIZE}`),
    placeholderData: keepPreviousData,
  });

export type RecordPaymentBody = {
  subscriptionId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  paidAt: string;
  receiptPath: string | null;
  note: string | null;
};

export const recordPayment = (body: RecordPaymentBody) => apiSend<PaymentView>('POST', '/payments', body);

export const receiptUrl = (paymentId: string) => apiFetch<SignedDownload>(`/payments/${paymentId}/receipt`);

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
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
  return day >= today ? now.toISOString() : new Date(`${day}T12:00:00+03:00`).toISOString();
}
