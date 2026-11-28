import type {
  SalesChatReceipt,
  SalesChatReceiptFile,
  SalesFamilyView,
  SalesMoneySubscriptionView,
  SalesPaymentView,
  SalesQuoteView,
  SalesReceiptCopied,
  SignedUpload,
} from '@ab/shared';
import type { SubscriptionPricing } from '@ab/money';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { uploadSigned } from '@/lib/storage/upload-slot';
import { pathKey, salesCourseCalls } from '@ab/client-core';
import { myMoneyKeys, salesMoneyKeys, salesSubscriptionKeys } from '@/features/sales/keys';

// The salesperson's money writes from the chat (R-ASST-01/04, docs/16): /sales/money/*,
// /sales/subscriptions and /sales/payments. Only her students; the price always from the API. `Bind`: the chat's
// phone for a child not hers (chatBinding, sales.renew_any, docs/16 row 38); nothing for hers.

export interface Bind { phone?: string }
const scopeQuery = (studentId: string, bind: Bind) =>
  `studentId=${studentId}${bind.phone ? `&phone=${encodeURIComponent(bind.phone)}` : ''}`;

/** Every sales money read lives under it (family, chat receipts, quotes). */
export const SALES_MONEY_KEY = salesMoneyKeys.all;

/** GET /sales/money/family: her students in this chat's family, each with its packages still owed. */
export const salesFamilyQuery = (phone: string) =>
  queryOptions({
    queryKey: salesMoneyKeys.family(phone),
    queryFn: () => apiFetch<SalesFamilyView>(`/sales/money/family?phone=${encodeURIComponent(phone)}`),
  });

/** GET /sales/money/chat-receipts: the images / PDFs the family sent (metadata only). */
export const chatReceiptsQuery = (studentId: string, bind: Bind = {}) =>
  queryOptions({
    queryKey: salesMoneyKeys.chatReceipts(studentId),
    queryFn: () => apiFetch<SalesChatReceipt[]>(`/sales/money/chat-receipts?${scopeQuery(studentId, bind)}`),
  });

/** GET /sales/money/chat-receipts/:messageId: a short-lived thumbnail URL, asked per item. */
export const chatReceiptFileQuery = (studentId: string, messageId: string, bind: Bind = {}) =>
  queryOptions({
    queryKey: salesMoneyKeys.chatReceipt(studentId, messageId),
    queryFn: () => apiFetch<SalesChatReceiptFile>(`/sales/money/chat-receipts/${messageId}?${scopeQuery(studentId, bind)}`),
    staleTime: 60_000,
  });

export type SalesQuoteBody = Bind & { studentId: string; pricing: SubscriptionPricing };

export const quoteSalesSubscription = (body: SalesQuoteBody) =>
  apiSend<SalesQuoteView>('POST', '/sales/subscriptions/quote', body);

/** Never a price; `startsOn` needs subscriptions.set_start_date; used lessons only when started. */
export type SalesSubscriptionBody = SalesQuoteBody & {
  startsOn?: string;
  alreadyStarted?: true;
  lessonsUsedBefore?: number;
  /** The teacher, stored as students.teacher_id once subscribed. */
  teacherId?: string;
  /** A custom price instead of the quote's; the admin's cap applies. */
  customPrice?: number;
  clientRequestId: string;
};

export const createSalesSubscription = (body: SalesSubscriptionBody) =>
  apiSend<SalesMoneySubscriptionView>('POST', '/sales/subscriptions', body);

/** Cancels a package made by mistake: only when nothing is paid and no lessons. */
export const cancelSalesSubscription = (id: string, body: { reason?: string }) =>
  apiSend<SalesMoneySubscriptionView>('POST', `/sales/subscriptions/${id}/cancel`, body);

/** Never kind, method or invoiceId (always a bank payment); 0 to 5 optional attachment paths. */
export type SalesPaymentBody = Bind & {
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
export const receiptFromChat = (body: Bind & { subscriptionId: string; messageId: string }) =>
  apiSend<SalesReceiptCopied>('POST', '/sales/payments/receipt-from-chat', body);

/** The admin's uploadReceipt, through the sales signed URL (the package must be her student's). */
export async function uploadSalesReceipt(input: {
  subscriptionId: string;
  file: File;
  bind?: Bind;
}): Promise<string> {
  const { file } = input;
  const signed = await apiSend<SignedUpload>('POST', '/sales/payments/receipt-upload-url', {
    subscriptionId: input.subscriptionId,
    mime: file.type,
    size: file.size,
    ...input.bind,
  });
  const { error } = await uploadSigned(signed, { body: file, contentType: file.type });
  if (error) throw error;
  return signed.path;
}

/** Refreshes the chat list (subscribed badge), her money reads and her payments and students. */
export async function refreshAfterSalesWrite(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: pathKey('/threads') }),
    queryClient.invalidateQueries({ queryKey: SALES_MONEY_KEY }),
    queryClient.invalidateQueries({ queryKey: myMoneyKeys.all }),
    queryClient.invalidateQueries({ queryKey: salesSubscriptionKeys.all }),
  ]);
}

const salesCourse = salesCourseCalls({ apiFetch, apiSend });

/** What the course-days dialog needs: the subscription's facts, or why she can't book. */
export const salesCourseQuery = (studentId: string) =>
  queryOptions({
    queryKey: salesMoneyKeys.course(studentId),
    queryFn: () => salesCourse.view(studentId),
  });
