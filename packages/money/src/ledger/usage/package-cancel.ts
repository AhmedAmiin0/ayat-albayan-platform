import { z } from 'zod';
import type { SubscriptionStatus } from '@ab/catalog';

// «إلغاء الباقة» (owner 2026-10-28): a package made by mistake is cancelled, never deleted. Only one
// nothing hangs on: no money kept (net paid 0) and no lesson booked on it. A cancelled package stays
// in the history («ملغاة»), is never current, never owed, never bookable and never earns commission.

/** POST /subscriptions/:id/cancel and POST /sales/subscriptions/:id/cancel. */
export const subscriptionCancelSchema = z.strictObject({ reason: z.string().trim().max(500).optional() });
export type SubscriptionCancel = z.infer<typeof subscriptionCancelSchema>;

export type CancelBlock = 'already_cancelled' | 'has_payments' | 'has_lessons' | 'has_commission';

export interface CancelFacts {
  status: SubscriptionStatus;
  /** Net paid (payments − refunds) in the package currency. */
  paid: number;
  /** Non-cancelled lessons on a course rule of it, plus the lessons it used FIFO (v_subscription_balance). */
  lessons: number;
  /** A later live priced package of the student already has an assistant commission (kind 'renewal' by this one). */
  laterCommission?: boolean;
}

/** Why the package may not be cancelled (the 409 code), or null when it may. */
export function cancelBlock(facts: CancelFacts): CancelBlock | null {
  if (facts.status === 'cancelled') return 'already_cancelled';
  if (facts.paid !== 0) return 'has_payments';
  if (facts.lessons > 0) return 'has_lessons';
  if (facts.laterCommission) return 'has_commission';
  return null;
}

export const isCancelled = (p: { status: SubscriptionStatus }): boolean => p.status === 'cancelled';

/**
 * Whether the package still counts for money (owner 2026-10-30, migration 991): every one but an
 * unused cancel. A STOPPED package («إلغاء الاشتراك»: the course stopped, the money kept) stays
 * owed, paid into, used FIFO and commissioned. SQL twin: status <> 'cancelled' or cancel_kind =
 * 'stopped'.
 */
export const countsForMoney = (p: {
  status: SubscriptionStatus;
  cancel_kind?: string | null;
}): boolean => p.status !== 'cancelled' || p.cancel_kind === 'stopped';

/** countsForMoney as a PostgREST `.or()` filter on subscriptions. */
export const COUNTS_FOR_MONEY = 'status.neq.cancelled,cancel_kind.eq.stopped';

/** The packages that still count (owed, current, alerts, renewals): every one but a cancelled one. */
export function livePackages<T extends { status: SubscriptionStatus }>(packages: readonly T[]): T[] {
  return packages.filter((p) => !isCancelled(p));
}

/** «الباقة الحالية»: the newest active package, else the newest; never a cancelled one. Newest first in. */
export function currentPackage<T extends { status: SubscriptionStatus }>(newestFirst: readonly T[]): T | null {
  const live = livePackages(newestFirst);
  return live.find((p) => p.status === 'active') ?? live[0] ?? null;
}

type CancelRow = { status: SubscriptionStatus; paid: number; balance?: { lessons_used: number } };

/**
 * Whether a package row offers «إلغاء الباقة»: not cancelled, nothing paid and, where the row carries its
 * balance (v_subscription_balance), no lesson used. The course's booked lessons and a later package's
 * commission are not on the row: the API answers 409 has_lessons / has_commission for those.
 */
export function cancelOffered(p: CancelRow): boolean {
  return !isCancelled(p) && p.paid === 0 && (p.balance === undefined || p.balance.lessons_used === 0);
}
