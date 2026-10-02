import type { AdminTaskKind, SubscriptionStatus } from '../enums/index.js';

// R-SUB-02: at `threshold` lessons left (settings.renewal_alert_remaining = 2) the guardian gets a
// renewal reminder and an admin gets a task; at 0 the package is `unpaid` and the student's future
// lessons are flagged (settings.flag_future_lessons_when_unpaid), never cancelled.

export type BalanceAlert = 'renewal' | 'unpaid';

/**
 * Which alert a student's balance calls for. `remaining` is the student's units left across all
 * packages (sum of their v_subscription_balance.remaining), so an early renewal silences the
 * alert. `status` is the newest package's: a paused or trial package raises nothing.
 * Fires on ≤ threshold, not = threshold, so two lessons closed at once still alert; the dedup key
 * makes the second evaluation a no-op.
 */
export function alertFor(input: {
  remaining: number;
  threshold: number;
  status?: SubscriptionStatus;
}): BalanceAlert | null {
  if (input.status === 'paused' || input.status === 'trial') return null;
  if (input.remaining <= 0) return 'unpaid';
  if (input.remaining <= input.threshold) return 'renewal';
  return null;
}

export const ALERT_TASK_KIND: Record<BalanceAlert, AdminTaskKind> = {
  renewal: 'renewal_due',
  unpaid: 'subscription_unpaid',
};

/**
 * One key per alert per package (rule 8), used as admin_tasks.dedup_key and
 * messages.dedup_key: `renewal_due:{subscriptionId}`, `subscription_unpaid:{subscriptionId}`.
 */
export function alertDedupKey(alert: BalanceAlert, subscriptionId: string): string {
  return `${ALERT_TASK_KIND[alert]}:${subscriptionId}`;
}

/** The student's units left across every package (FIFO: earlier ones are never negative). */
export function studentRemaining(balances: readonly { remaining: number }[]): number {
  return balances.reduce((sum, b) => sum + b.remaining, 0);
}

export interface StatusInput {
  current: SubscriptionStatus;
  /** Sum of the package's payments in its own currency. */
  paid: number;
  price: number;
  remaining: number;
  /** A newer package of the same student exists. */
  superseded: boolean;
}

/**
 * The derived status after a payment, an outcome or a renewal (R-SUB-01/02, journey 3):
 * paused and trial are set by hand and stay; money still owed → unpaid; used up → expired when a
 * newer package took over, else unpaid (renewal needed); otherwise active.
 */
export function subscriptionStatusFor(input: StatusInput): SubscriptionStatus {
  if (input.current === 'paused' || input.current === 'trial') return input.current;
  if (input.paid < input.price) return 'unpaid';
  if (input.remaining <= 0) return input.superseded ? 'expired' : 'unpaid';
  return 'active';
}
