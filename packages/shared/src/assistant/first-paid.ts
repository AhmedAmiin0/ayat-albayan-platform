import { toCents } from '../money/earnings.js';
import { computeCommission, type AssistantCommissionType, type CommissionAmount } from './commission.js';

// "Fully paid" and "first" (migration 20261006000272: subscription_full_at, evaluate_assistant_commission).
// Derived from the payments, never stored: net paid (payments - refunds, in the package currency) has
// reached the price, and the price is above zero (a free package brings nothing).

export interface PaymentFact {
  amount: number;
  kind: 'payment' | 'refund';
  paid_at: string;
  created_at?: string;
  id?: string;
}

export interface SubscriptionFact {
  id: string;
  price: number;
  currency: string;
  created_at: string;
  payments: readonly PaymentFact[];
}

const byTime = (a: PaymentFact, b: PaymentFact) =>
  Date.parse(a.paid_at) - Date.parse(b.paid_at) ||
  Date.parse(a.created_at ?? a.paid_at) - Date.parse(b.created_at ?? b.paid_at) ||
  (a.id ?? '').localeCompare(b.id ?? '');

/**
 * When the subscription became fully paid: the paid_at of the payment that LAST took the running net
 * from below the price to the price (a refund then a new payment moves it); null when it is not.
 */
export function subscriptionFullAt(sub: Pick<SubscriptionFact, 'price' | 'payments'>): string | null {
  const price = toCents(sub.price);
  if (price <= 0) return null;
  let net = 0;
  let crossedAt: string | null = null;
  for (const p of [...sub.payments].sort(byTime)) {
    const before = net;
    net += (p.kind === 'refund' ? -1 : 1) * toCents(p.amount);
    if (net >= price && before < price) crossedAt = p.paid_at;
    else if (net < price) crossedAt = null;
  }
  return net >= price ? crossedAt : null;
}

export interface FirstFullyPaid {
  subscription: SubscriptionFact;
  fullAt: string;
}

/** The student's first fully paid subscription: earliest fullAt, then created_at, then id. */
export function firstFullyPaid(subs: readonly SubscriptionFact[]): FirstFullyPaid | null {
  const paid = subs.flatMap((s) => {
    const fullAt = subscriptionFullAt(s);
    return fullAt ? [{ subscription: s, fullAt }] : [];
  });
  paid.sort(
    (a, b) =>
      Date.parse(a.fullAt) - Date.parse(b.fullAt) ||
      Date.parse(a.subscription.created_at) - Date.parse(b.subscription.created_at) ||
      a.subscription.id.localeCompare(b.subscription.id),
  );
  return paid[0] ?? null;
}

/** The calendar day (YYYY-MM-DD) of an instant in a time zone. */
export function localDay(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

export interface CommissionTermsInput {
  type: AssistantCommissionType;
  value: number;
  currency: string | null;
  /** YYYY-MM-DD: no retroactive commission. */
  startsOn: string;
}

export interface PlannedCommission extends CommissionAmount {
  subscriptionId: string;
  fullAt: string;
  base: number;
  baseCurrency: string;
}

/**
 * The commission a student would earn: null unless somebody brought them, the assistant has terms, the
 * first fully paid subscription became fully paid on or after startsOn (in the assistant's tz) and the
 * amount is above zero. A later subscription never earns one: only the FIRST counts.
 */
export function planCommission(input: {
  broughtBy: string | null;
  terms: CommissionTermsInput | null;
  tz: string;
  subscriptions: readonly SubscriptionFact[];
}): PlannedCommission | null {
  if (!input.broughtBy || !input.terms) return null;
  const first = firstFullyPaid(input.subscriptions);
  if (!first || localDay(first.fullAt, input.tz) < input.terms.startsOn) return null;
  const { price, currency, id } = first.subscription;
  const amount = computeCommission({ ...input.terms, base: price, baseCurrency: currency });
  return amount ? { ...amount, subscriptionId: id, fullAt: first.fullAt, base: price, baseCurrency: currency } : null;
}
