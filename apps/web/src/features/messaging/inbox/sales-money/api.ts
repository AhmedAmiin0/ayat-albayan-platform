import type {
  SalesChatReceipt,
  SalesChatReceiptFile,
  SalesCourseView,
  SalesFamilyView,
  SalesMoneySubscriptionView,
  SalesPaymentView,
  SalesQuoteView,
  SalesReceiptCopied,
  SignedUpload,
  SubscriptionPricing,
} from '@ab/shared';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';
import { supabase } from '@/lib/http/supabase';

// The salesperson's money writes from the chat (R-ASST-01/04, docs/16): /sales/money/*,
// /sales/subscriptions and /sales/payments. Only her students; the price always from the API.

/** Every sales money read lives under it (family, chat receipts, quotes). */
export const SALES_MONEY_KEY = ['sales', 'money'] as const;

/** GET /sales/money/family: her students in this chat's family, each with its packages still owed. */
export const salesFamilyQuery = (phone: string) =>
  queryOptions({
    queryKey: [...SALES_MONEY_KEY, 'family', phone],
    queryFn: () => apiFetch<SalesFamilyView>(`/sales/money/family?phone=${encodeURIComponent(phone)}`),
  });

/** GET /sales/money/chat-receipts: the images / PDFs the family sent (metadata only). */
export const chatReceiptsQuery = (studentId: string) =>
  queryOptions({
    queryKey: [...SALES_MONEY_KEY, 'chat-receipts', studentId],
    queryFn: () => apiFetch<SalesChatReceipt[]>(`/sales/money/chat-receipts?studentId=${studentId}`),
  });

/** GET /sales/money/chat-receipts/:messageId: a short-lived thumbnail URL, asked per item. */
export const chatReceiptFileQuery = (studentId: string, messageId: string) =>
  queryOptions({
    queryKey: [...SALES_MONEY_KEY, 'chat-receipt', studentId, messageId],
    queryFn: () => apiFetch<SalesChatReceiptFile>(`/sales/money/chat-receipts/${messageId}?studentId=${studentId}`),
    staleTime: 60_000,
  });

export type SalesQuoteBody = { studentId: string; pricing: SubscriptionPricing };

export const quoteSalesSubscription = (body: SalesQuoteBody) =>
  apiSend<SalesQuoteView>('POST', '/sales/subscriptions/quote', body);

/**
 * Strict body: no notes, no renewal day, never a price. `startsOn` only with subscriptions.set_start_date
 * (else the API's default day); `alreadyStarted` only when «بدأ الاشتراك سابقًا» is ticked.
 */
export type SalesSubscriptionBody = SalesQuoteBody & { startsOn?: string; alreadyStarted?: true; clientRequestId: string };

export const createSalesSubscription = (body: SalesSubscriptionBody) =>
  apiSend<SalesMoneySubscriptionView>('POST', '/sales/subscriptions', body);

/** «إلغاء الباقة» of her student's package made by mistake (owner 2026-10-28): nothing paid, no lessons. */
export const cancelSalesSubscription = (id: string, body: { reason?: string }) =>
  apiSend<SalesMoneySubscriptionView>('POST', `/sales/subscriptions/${id}/cancel`, body);

/** Strict body: never kind / method / invoiceId (always a bank payment); «المرفقات» optional (0..5 paths). */
export type SalesPaymentBody = {
  subscriptionId: string;
  amount: number;
  currency: string;
  paidAt: string;
  attachments: string[];
  note: string | null;
  clientRequestId: string;
};

export const recordSalesPayment = (body: SalesPaymentBody) => apiSend<SalesPaymentView>('POST', '/sales/payments', body);

/** POST /sales/payments/receipt-from-chat: copies the chat file into the package's receipts. */
export const receiptFromChat = (body: { subscriptionId: string; messageId: string }) =>
  apiSend<SalesReceiptCopied>('POST', '/sales/payments/receipt-from-chat', body);

/** The admin's uploadReceipt, through the sales signed URL (the package must be her student's). */
export async function uploadSalesReceipt(input: { subscriptionId: string; file: File }): Promise<string> {
  const { file } = input;
  const signed = await apiSend<SignedUpload>('POST', '/sales/payments/receipt-upload-url', {
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

/** After a write: the chat list (the «مشترك» badge), her money reads and «مدفوعاتي» / «طلابي». */
export async function refreshAfterSalesWrite(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['threads'] }),
    queryClient.invalidateQueries({ queryKey: SALES_MONEY_KEY }),
    queryClient.invalidateQueries({ queryKey: ['sales', 'me'] }),
    queryClient.invalidateQueries({ queryKey: ['sales', 'subscriptions'] }),
  ]);
}

/** GET /sales/booking/course?studentId=: what «أيام الحلقات» needs (the subscription's facts, or why she can't). */
export const salesCourseQuery = (studentId: string) =>
  queryOptions({
    queryKey: [...SALES_MONEY_KEY, 'course', studentId],
    queryFn: () => apiFetch<SalesCourseView>(`/sales/booking/course?studentId=${encodeURIComponent(studentId)}`),
  });
