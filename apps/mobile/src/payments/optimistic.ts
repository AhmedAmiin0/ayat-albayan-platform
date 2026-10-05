import {
  roundCents,
  type PaymentMethod,
  type PaymentView,
  type StudentBalanceView,
  type SubscriptionView,
} from '@ab/shared';
import type { Page } from '@/lib/paging';
import type { Receipt } from './receipt';

/** One payment as the form hands it to the mutation. */
export interface PaymentInput {
  subscriptionId: string;
  student: PaymentView['student'];
  amount: number;
  currency: string;
  method: PaymentMethod;
  /** ISO instant, never ahead of now (paid-day.ts). */
  paidAt: string;
  receipt: Receipt | null;
}

const PENDING = 'pending:';

/** The row the lists show while POST /payments is on its way (R-MOB-03 optimistic). */
export function pendingPayment(input: PaymentInput): PaymentView {
  return {
    id: `${PENDING}${input.subscriptionId}:${input.paidAt}`,
    subscription_id: input.subscriptionId,
    student: input.student,
    amount: input.amount,
    currency: input.currency,
    method: input.method,
    paid_at: input.paidAt,
    receipt_path: null,
    recorded_by: null,
    note: null,
    created_at: input.paidAt,
    kind: 'payment',
    original: null,
    invoice_id: null,
  };
}

export function isPending(payment: PaymentView): boolean {
  return payment.id.startsWith(PENDING);
}

/** The row first in a cached GET /payments page. */
export function withPayment(
  page: Page<PaymentView> | undefined,
  row: PaymentView,
): Page<PaymentView> | undefined {
  return page && { ...page, items: [row, ...page.items], total: page.total + 1 };
}

/** The amount added to that package's `paid` in a cached balance; the status comes on refetch. */
export function withPaid(
  balance: StudentBalanceView | undefined,
  input: Pick<PaymentInput, 'subscriptionId' | 'amount'>,
): StudentBalanceView | undefined {
  if (!balance) return balance;
  const add = (s: SubscriptionView): SubscriptionView =>
    s.id === input.subscriptionId ? { ...s, paid: roundCents(s.paid + input.amount) } : s;
  return { ...balance, current: balance.current && add(balance.current), packages: balance.packages.map(add) };
}
