import { parseAmount, type SalesMoneySubscriptionView } from '@ab/shared';
import { t } from '@/lib/i18n';
import type { Attachment } from '@/payments/attachments';
import { paidAtFor } from '@/payments/paid-day';

// «سجّل تحويلًا بنكيًا» (R-ASST-04): what she entered, checked. Pure. The method is always the
// bank's (the API sets it), the currency always the package's (owner 2026-10-12); «المرفقات» are
// optional (owner 2026-10-12: an old student has no receipt), up to 5, from the chat or a photo.

/** From the chat: already copied under the package (its path). A photo: uploaded on save. */
export type ReceiptChoice = Attachment;

export interface TransferDraft {
  amountText: string;
  /** Days back on the Riyadh calendar; 0 = today. */
  daysAgo: number;
  note: string;
  attachments: ReceiptChoice[];
}

/** The amount still due (in the package currency), today. */
export function draftFor(sub: SalesMoneySubscriptionView): TransferDraft {
  return { amountText: String(sub.due), daysAgo: 0, note: '', attachments: [] };
}

export interface TransferInput {
  subscriptionId: string;
  amount: number;
  currency: string;
  paidAt: string;
  note: string | null;
  attachments: ReceiptChoice[];
}

export interface TransferCheck {
  input?: TransferInput;
  errors: { amount?: string };
}

export function checkTransfer(draft: TransferDraft, context: { sub: SalesMoneySubscriptionView; now: Date }): TransferCheck {
  const amount = parseAmount(draft.amountText);
  if (amount === null || amount <= 0) return { errors: { amount: t.salesMoney.error.amount } };
  const note = draft.note.trim();
  return {
    errors: {},
    input: {
      subscriptionId: context.sub.id,
      amount,
      currency: context.sub.currency,
      paidAt: paidAtFor(context.now, draft.daysAgo).toISOString(),
      note: note === '' ? null : note,
      attachments: draft.attachments,
    },
  };
}
