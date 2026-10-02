import type { PaymentMethod, StudentBalanceView, SubscriptionView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { parseAmount } from './amount';
import type { PaymentInput } from './optimistic';
import { paidAtFor } from './paid-day';
import type { Receipt } from './receipt';

/** What the admin has entered so far. Nothing is prefilled that the receipt should say. */
export interface PaymentDraft {
  /** Picked package; undefined → defaultPackage. */
  subscriptionId?: string;
  amountText: string;
  method?: PaymentMethod;
  /** Days back on the Riyadh calendar; 0 = today (paid-day.ts). */
  daysAgo: number;
  receipt: Receipt | null;
}

export const emptyDraft: PaymentDraft = { amountText: '', daysAgo: 0, receipt: null };

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

export interface DraftCheck {
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
  return {
    errors,
    input: {
      subscriptionId: sub.id,
      student: sub.student,
      amount,
      currency: sub.currency,
      method: draft.method,
      paidAt: paidAtFor(now, draft.daysAgo).toISOString(),
      receipt: draft.receipt,
    },
  };
}
