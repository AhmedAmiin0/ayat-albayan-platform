import { z } from 'zod';
import type { SubscriptionStatus } from '../../enums/index.js';

// «إلغاء الباقة» (owner 2026-10-28): a package made by mistake is cancelled, never deleted. Only one
// nothing hangs on: no money kept (net paid 0) and no lesson booked on it. A cancelled package stays
// in the history («ملغاة»), is never current, never owed, never bookable and never earns commission.

/** POST /subscriptions/:id/cancel and POST /sales/subscriptions/:id/cancel. */
export const subscriptionCancelSchema = z.strictObject({ reason: z.string().trim().max(500).optional() });
export type SubscriptionCancel = z.infer<typeof subscriptionCancelSchema>;

export type CancelBlock = 'already_cancelled' | 'has_payments' | 'has_lessons';

export interface CancelFacts {
  status: SubscriptionStatus;
  /** Net paid (payments − refunds) in the package currency. */
  paid: number;
  /** Non-cancelled lessons linked to the package or to a course rule of it. */
  lessons: number;
}

/** Why the package may not be cancelled (the 409 code), or null when it may. */
export function cancelBlock(facts: CancelFacts): CancelBlock | null {
  if (facts.status === 'cancelled') return 'already_cancelled';
  if (facts.paid !== 0) return 'has_payments';
  if (facts.lessons > 0) return 'has_lessons';
  return null;
}

export const isCancelled = (p: { status: SubscriptionStatus }): boolean => p.status === 'cancelled';

/** The packages that still count (owed, current, alerts, renewals): every one but a cancelled one. */
export function livePackages<T extends { status: SubscriptionStatus }>(packages: readonly T[]): T[] {
  return packages.filter((p) => !isCancelled(p));
}

/** «الباقة الحالية»: the newest active package, else the newest; never a cancelled one. Newest first in. */
export function currentPackage<T extends { status: SubscriptionStatus }>(newestFirst: readonly T[]): T | null {
  const live = livePackages(newestFirst);
  return live.find((p) => p.status === 'active') ?? live[0] ?? null;
}

/**
 * Whether a package row offers «إلغاء الباقة»: not cancelled and nothing paid. Lessons are not on the row:
 * the API answers 409 has_lessons for a package whose course has lessons.
 */
export function cancelOffered(p: { status: SubscriptionStatus; paid: number }): boolean {
  return !isCancelled(p) && p.paid === 0;
}
