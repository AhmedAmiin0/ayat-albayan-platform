import type { SalesMoneySubscriptionView } from '@ab/shared';
import { parseAmount } from '@ab/money';
import { t } from '@ab/mobile-kit';
import type { Attachment } from '@/payments/receipts/attachments';
import { paidAtFor } from '@/core/lib/money/paid-day';

// R-ASST-04: the API sets the bank method; currency is the package's; attachments optional.

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

interface TransferCheck {
  input?: TransferInput;
  errors: { amount?: string };
}

export function checkTransfer(
  draft: TransferDraft,
  context: { sub: SalesMoneySubscriptionView; now: Date },
): TransferCheck {
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
