import { z } from 'zod';
import { localDate } from '../schemas/lessons/scheduling.js';
import { optionalText, phoneE164 } from '../schemas/common.js';
import { currencyIso, LESSONS_USED_BEFORE_MAX, moneyAmount, pastInstant, paymentAttachmentPaths, receiptUploadSchema, subscriptionPricingSchema } from '../money/schemas.js';

// The salesperson's money writes from the chat (owner 2026-10-12, R-ASST-01/04, docs/16): she subscribes
// a student she brought and records the family's bank transfer with its receipt. Same rules as the admin's
// commands, narrower: no typed price ever, no notes, no refund, no invoice, the method is always 'bank',
// every write carries its clientRequestId (rule 8). Owner 2026-10-12 (docs/16 rows 24–25): the receipt is
// OPTIONAL now (old students have none) and the files go in `attachments` (0..5); `startsOn` is honoured only
// with subscriptions.set_start_date (salesStartDate), a past day only with `alreadyStarted`. The API narrows further
// (docs/16 rows 20–22): only the site's discount pills (403 discount_not_allowed) and the package currency
// (400 currency_mismatch; `currency` stays for client compatibility). Strict objects: a field
// the admin's form has but hers does not (kind, method, invoiceId…) is a 400, never silently dropped.

/**
 * The chat the write comes from (owner 2026-10-29, docs/16 row 38): with sales.renew_any a student she does not
 * own is accepted when this is its family's phone (403 not_your_student otherwise). Ignored for her own students.
 */
const chatPhone = phoneE164.optional();

/** POST /sales/subscriptions/quote: the price the create would store, for the student she owns. */
export const salesQuoteSchema = z.strictObject({ studentId: z.uuid(), pricing: subscriptionPricingSchema, phone: chatPhone });

/** POST /sales/subscriptions: priced by the API from the catalog, like POST /subscriptions. */
export const salesSubscriptionCreateSchema = z.strictObject({
  studentId: z.uuid(),
  pricing: subscriptionPricingSchema,
  /** Omitted = the default day (today, Riyadh). */
  startsOn: localDate.optional(),
  /** «بدأ الاشتراك سابقًا»: allows a past startsOn (subscriptions.set_start_date only). */
  alreadyStarted: z.boolean().optional(),
  /** «حلقات مستخدمة من الباقة» (owner 2026-10-28): only with alreadyStarted; 0..usedBeforeMax (usedBeforeProblem). */
  lessonsUsedBefore: z.int().min(0).max(LESSONS_USED_BEFORE_MAX).optional(),
  clientRequestId: z.uuid(),
  phone: chatPhone,
});

/** POST /sales/payments: one bank transfer; its files (from the chat or uploaded) optional, in `attachments`. */
export const salesPaymentCreateSchema = z.strictObject({
  subscriptionId: z.uuid(),
  amount: moneyAmount,
  currency: currencyIso,
  paidAt: pastInstant,
  /** Before 2026-10-12 clients sent the one receipt here; still accepted, stored as before. */
  receiptPath: z.string().min(1).nullish(),
  attachments: paymentAttachmentPaths.optional(),
  note: optionalText,
  clientRequestId: z.uuid(),
  phone: chatPhone,
});

/** POST /sales/payments/receipt-upload-url: same body as the admin's, the subscription must be her student's. */
export const salesReceiptUploadSchema = receiptUploadSchema.extend({ phone: chatPhone });

/** POST /sales/payments/receipt-from-chat: copy one image / PDF of the family's chat into receipts/{subscriptionId}/. */
export const salesChatReceiptCopySchema = z.strictObject({ subscriptionId: z.uuid(), messageId: z.uuid(), phone: chatPhone });

/** GET /sales/money/family?phone: her students in the family of this chat (every one with sales.renew_any). */
export const salesFamilyQuerySchema = z.object({ phone: phoneE164 });

/** GET /sales/money/chat-receipts?studentId (and /:messageId): the receipts the family sent. */
export const salesChatReceiptsQuerySchema = z.object({ studentId: z.uuid(), phone: chatPhone });

export type SalesQuote = z.output<typeof salesQuoteSchema>;
export type SalesSubscriptionCreate = z.output<typeof salesSubscriptionCreateSchema>;
export type SalesPaymentCreate = z.output<typeof salesPaymentCreateSchema>;
export type SalesChatReceiptCopy = z.output<typeof salesChatReceiptCopySchema>;
export type SalesReceiptUpload = z.output<typeof salesReceiptUploadSchema>;

/**
 * The `phone` a client adds to a sales money write (docs/16 row 38): the chat's phone for a student the family
 * view lists with `mine: false` (sales.renew_any), nothing for hers, so the bodies for her own stay as they were.
 */
export function chatBinding(students: readonly { id: string; mine?: boolean }[], at: { studentId: string; phone: string }): { phone?: string } {
  const theirs = students.find((s) => s.id === at.studentId)?.mine === false;
  return theirs && at.phone !== '' ? { phone: at.phone } : {};
}
