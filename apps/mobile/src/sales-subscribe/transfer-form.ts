import { parseAmount, type SalesMoneySubscriptionView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { paidAtFor } from '@/payments/paid-day';
import type { Receipt } from '@/payments/receipt';

// «سجّل تحويلًا بنكيًا» (R-ASST-04): what she entered, checked. Pure. The method is always the
// bank's (the API sets it), the currency always the package's (owner 2026-10-12); the receipt is
// required, from the chat or a photo.

/** From the chat: already copied under the package (its path). A photo: uploaded on save. */
export type ReceiptChoice =
  | { kind: 'chat'; messageId: string; path: string }
  | { kind: 'file'; receipt: Receipt };

export interface TransferDraft {
  amountText: string;
  /** Days back on the Riyadh calendar; 0 = today. */
  daysAgo: number;
  note: string;
  receipt: ReceiptChoice | null;
}

/** The amount still due (in the package currency), today. */
export function draftFor(sub: SalesMoneySubscriptionView): TransferDraft {
  return { amountText: String(sub.due), daysAgo: 0, note: '', receipt: null };
}

export interface TransferInput {
  subscriptionId: string;
  amount: number;
  currency: string;
  paidAt: string;
  note: string | null;
  receipt: ReceiptChoice;
}

export interface TransferCheck {
  input?: TransferInput;
  errors: { amount?: string; receipt?: string };
}

export function checkTransfer(draft: TransferDraft, context: { sub: SalesMoneySubscriptionView; now: Date }): TransferCheck {
  const amount = parseAmount(draft.amountText);
  const errors: TransferCheck['errors'] = {};
  if (amount === null || amount <= 0) errors.amount = t.salesMoney.error.amount;
  if (!draft.receipt) errors.receipt = t.salesMoney.receiptRequired;
  if (amount === null || amount <= 0 || !draft.receipt) return { errors };
  const note = draft.note.trim();
  return {
    errors,
    input: {
      subscriptionId: context.sub.id,
      amount,
      currency: context.sub.currency,
      paidAt: paidAtFor(context.now, draft.daysAgo).toISOString(),
      note: note === '' ? null : note,
      receipt: draft.receipt,
    },
  };
}
