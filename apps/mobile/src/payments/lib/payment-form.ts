import { parseAmount, type PaymentMethod, type StudentBalanceView, type SubscriptionView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { type Attachment, withAttachment } from '../receipts/attachments';
import type { PaymentInput } from './optimistic';
import { paidAtFor } from './paid-day';
import type { Receipt } from '../receipt';

/** What the admin has entered so far. Nothing is prefilled that the receipt should say. */
export interface PaymentDraft {
  /** Picked package; undefined → defaultPackage. */
  subscriptionId?: string;
  amountText: string;
  method?: PaymentMethod;
  /** Days back on the Riyadh calendar; 0 = today (paid-day.ts). */
  daysAgo: number;
  /** Any method but a bank transfer: one optional slip photo. */
  receipt: Receipt | null;
  /** A bank transfer: «المرفقات», up to 5 (owner 2026-10-12). */
  attachments: Attachment[];
}

export const emptyDraft: PaymentDraft = { amountText: '', daysAgo: 0, receipt: null, attachments: [] };

/**
 * The method picked. Onto a bank transfer the slip already picked becomes its first attachment;
 * away from it the attachments are dropped (the API takes them for a bank transfer only).
 */
export function withMethod(draft: PaymentDraft, method: PaymentMethod): PaymentDraft {
  if (method !== 'bank') return { ...draft, method, attachments: [] };
  const attachments = draft.receipt ? withAttachment(draft.attachments, { kind: 'file', receipt: draft.receipt }) : draft.attachments;
  return { ...draft, method, receipt: null, attachments };
}

const owed = (p: SubscriptionView) => p.paid < p.price;

/** Packages a payment can go to: the current one and any older one still owed money, oldest first. */
export function payablePackages(balance: StudentBalanceView): SubscriptionView[] {
  return balance.packages.filter((p) => p.id === balance.current?.id || owed(p));
}

/** The oldest package still owed money (packages are used FIFO too), else the current one. */
export function defaultPackage(balance: StudentBalanceView): SubscriptionView | null {
  return balance.packages.find(owed) ?? balance.current;
}

/** The package the form is on: the picked one while it is still payable, else the default. */
export function chosenPackage(
  balance: StudentBalanceView,
  subscriptionId: string | undefined,
): SubscriptionView | null {
  return payablePackages(balance).find((p) => p.id === subscriptionId) ?? defaultPackage(balance);
}

interface DraftCheck {
  input?: PaymentInput;
  errors: { amount?: string; method?: string };
}

/**
 * The payment to send, or why not. The currency is always the package's (v1 rule, docs/11 §7:
 * another currency is 400 currency_mismatch), so it is never asked.
 */
export function checkDraft(
  draft: PaymentDraft,
  context: { sub: SubscriptionView; now: Date },
): DraftCheck {
  const amount = parseAmount(draft.amountText);
  const errors: DraftCheck['errors'] = {};
  if (amount === null) {
    errors.amount = draft.amountText.trim() ? t.payments.mobile.amountInvalid : t.common.required;
  }
  if (!draft.method) errors.method = t.common.required;
  if (amount === null || !draft.method) return { errors };
  const { sub, now } = context;
  const bank = draft.method === 'bank';
  return {
    errors,
    input: {
      subscriptionId: sub.id,
      student: sub.student,
      amount,
      currency: sub.currency,
      method: draft.method,
      paidAt: paidAtFor(now, draft.daysAgo).toISOString(),
      receipt: bank ? null : draft.receipt,
      ...(bank && draft.attachments.length ? { attachments: draft.attachments } : {}),
    },
  };
}
