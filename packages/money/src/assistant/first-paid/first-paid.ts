import { toCents } from '@ab/core';
import { computeCommission } from '../commission';
import { commissionKindOf } from '../kind';
import { subscriptionAlreadyStarted } from '../started';
import { localDateIn } from '@ab/time';
import type {
  CommissionContext,
  CommissionTermsInput,
  FirstFullyPaid,
  PaymentFact,
  PlannedCommission,
  Running,
  SubscriptionFact,
} from './first-paid.types';

// "Fully paid" and "first" (migration 20261006000272: subscription_full_at,
// evaluate_assistant_commission). Derived from the payments, never stored: net paid (payments -
// refunds, in the package currency) has reached the price, and the price is above zero (a free
// package brings nothing).

const createdAtOf = (p: PaymentFact): number => Date.parse(p.created_at ?? p.paid_at);
const idOf = (p: PaymentFact): string => p.id ?? '';
const byTime = (a: PaymentFact, b: PaymentFact) =>
  Date.parse(a.paid_at) - Date.parse(b.paid_at) ||
  createdAtOf(a) - createdAtOf(b) ||
  idOf(a).localeCompare(idOf(b));

function addPayment(run: Running, p: PaymentFact, price: number): Running {
  const net = run.net + (p.kind === 'refund' ? -1 : 1) * toCents(p.amount);
  if (net < price) return { net, crossedAt: null };
  return { net, crossedAt: run.net < price ? p.paid_at : run.crossedAt };
}

/**
 * When the subscription became fully paid: the paid_at of the payment that LAST took the running
 * net from below the price to the price (a refund then a new payment moves it); null when it is
 * not.
 */
export function subscriptionFullAt(
  sub: Pick<SubscriptionFact, 'price' | 'payments'>,
): string | null {
  const price = toCents(sub.price);
  if (price <= 0) return null;
  let run: Running = { net: 0, crossedAt: null };
  for (const p of [...sub.payments].sort(byTime)) run = addPayment(run, p, price);
  return run.net >= price ? run.crossedAt : null;
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

/**
 * What one subscription earns at `share` % of the normal commission: null unless somebody brought
 * the student, the assistant has terms, it is fully paid on or after BOTH startsOn and the day the
 * student was brought (in the assistant's tz: nothing is retroactive), the course did not start
 * before it was recorded (subscriptionAlreadyStarted) and the amount is above zero.
 */
export function planOn(
  ctx: CommissionContext,
  sub: SubscriptionFact,
  share: number,
): PlannedCommission | null {
  const fullAt = subscriptionFullAt(sub);
  if (!fullAt || subscriptionAlreadyStarted(sub)) return null;
  const terms = termsOn(ctx, fullAt);
  if (!terms) return null;
  const { price, currency, id } = sub;
  const amount = computeCommission({ ...terms, base: price, baseCurrency: currency, share });
  return amount
    ? { ...amount, subscriptionId: id, fullAt, base: price, baseCurrency: currency }
    : null;
}

/** The terms a subscription fully paid at `fullAt` earns on, or null (see planOn). */
function termsOn(ctx: CommissionContext, fullAt: string): CommissionTermsInput | null {
  const { terms, broughtAt } = ctx;
  if (!ctx.broughtBy || !broughtAt || !terms) return null;
  const day = localDay(fullAt, ctx.tz);
  return day < terms.startsOn || day < localDay(broughtAt, ctx.tz) ? null : terms;
}

/**
 * The student's ONE 'first' commission (evaluate_assistant_commission): on the first fully paid of
 * its candidates, the first subscription BY ORDER (commissionKindOf) and the subscription an
 * existing 'first' row already sits on (`firstRowSubscriptionId`: a row never flips). A later
 * package is a renewal (planRenewalCommission), never a second first.
 */
export function planCommission(
  input: CommissionContext & {
    subscriptions: readonly SubscriptionFact[];
    firstRowSubscriptionId?: string | null;
    /** Subscriptions already holding a 'renewal' row: never a first (a row never flips). */
    renewalRowSubscriptionIds?: readonly string[];
  },
): PlannedCommission | null {
  const subs = input.subscriptions;
  const held = new Set(input.renewalRowSubscriptionIds ?? []);
  const isFirst = (s: SubscriptionFact) =>
    commissionKindOf(subs, s.id) === 'first' && !held.has(s.id);
  const candidates = subs.filter((s) => s.id === input.firstRowSubscriptionId || isFirst(s));
  const first = firstFullyPaid(candidates);
  return first ? planOn(input, first.subscription, 100) : null;
}
