import { toCents } from '@ab/core';
import { computeCommission, type AssistantCommissionType, type CommissionAmount } from './commission.js';
import { commissionKindOf } from './kind.js';
import { subscriptionAlreadyStarted, type StartFact } from './started.js';
import { localDateIn } from '../../time/index.js';

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

/** starts_on / lessons_used_before (StartFact): a course that already started earns nothing. */
export interface SubscriptionFact extends StartFact {
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
  return localDateIn(new Date(iso), tz);
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

/** Who brought the student, when, on which terms and zone: what every commission is checked against. */
export interface CommissionContext {
  broughtBy: string | null;
  /** When the student was brought (students.brought_at, an instant). */
  broughtAt: string | null;
  terms: CommissionTermsInput | null;
  tz: string;
}

/**
 * What one subscription earns at `share` % of the normal commission: null unless somebody brought the
 * student, the assistant has terms, it is fully paid on or after BOTH startsOn and the day the student was
 * brought (in the assistant's tz: nothing is retroactive), the course did not start before it was recorded
 * (subscriptionAlreadyStarted, owner 2026-10-28) and the amount is above zero.
 */
export function planOn(ctx: CommissionContext, sub: SubscriptionFact, share: number): PlannedCommission | null {
  const fullAt = subscriptionFullAt(sub);
  if (!ctx.broughtBy || !ctx.broughtAt || !ctx.terms || !fullAt || subscriptionAlreadyStarted(sub)) return null;
  const day = localDay(fullAt, ctx.tz);
  if (day < ctx.terms.startsOn || day < localDay(ctx.broughtAt, ctx.tz)) return null;
  const { price, currency, id } = sub;
  const amount = computeCommission({ ...ctx.terms, base: price, baseCurrency: currency, share });
  return amount ? { ...amount, subscriptionId: id, fullAt, base: price, baseCurrency: currency } : null;
}

/**
 * The student's ONE 'first' commission (evaluate_assistant_commission): on the first fully paid of its
 * candidates, the first subscription BY ORDER (commissionKindOf; owner 2026-10-26) and the subscription an
 * existing 'first' row already sits on (`firstRowSubscriptionId`: a row never flips). A later package is a
 * renewal (planRenewalCommission), never a second first.
 */
export function planCommission(input: CommissionContext & {
  subscriptions: readonly SubscriptionFact[];
  firstRowSubscriptionId?: string | null;
  /** Subscriptions already holding a 'renewal' row: never a first (a row never flips). */
  renewalRowSubscriptionIds?: readonly string[];
}): PlannedCommission | null {
  const subs = input.subscriptions;
  const held = new Set(input.renewalRowSubscriptionIds ?? []);
  const isFirst = (s: SubscriptionFact) => commissionKindOf(subs, s.id) === 'first' && !held.has(s.id);
  const candidates = subs.filter((s) => s.id === input.firstRowSubscriptionId || isFirst(s));
  const first = firstFullyPaid(candidates);
  return first ? planOn(input, first.subscription, 100) : null;
}
