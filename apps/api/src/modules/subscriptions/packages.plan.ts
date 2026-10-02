import {
  alertFor,
  studentRemaining,
  subscriptionStatusFor,
  type BalanceAlert,
  type SubscriptionStatus,
} from '@ab/shared';

// Pure decisions over one student's packages (R-SUB-01/02). Packages arrive in FIFO order
// (starts_on, created_at, id), the same order as v_subscription_balance.

export interface PlanPackage {
  id: string;
  status: SubscriptionStatus;
  price: number;
  lessons_total: number;
}
export interface PlanBalance {
  lessons_used: number;
  remaining: number;
}
export interface StudentPackages {
  subs: readonly PlanPackage[];
  balances: ReadonlyMap<string, PlanBalance>;
}

export type StatusChange = { id: string; from: SubscriptionStatus; to: SubscriptionStatus };

const balanceOf = (p: StudentPackages, s: PlanPackage): PlanBalance =>
  p.balances.get(s.id) ?? { lessons_used: 0, remaining: s.lessons_total };

/** Every package whose derived status differs from the stored one (subscriptionStatusFor). */
export function statusChanges(p: StudentPackages & { paid: ReadonlyMap<string, number> }): StatusChange[] {
  const last = p.subs.length - 1;
  return p.subs.flatMap((s, i) => {
    const to = subscriptionStatusFor({
      current: s.status,
      paid: p.paid.get(s.id) ?? 0,
      price: s.price,
      remaining: balanceOf(p, s).remaining,
      superseded: i < last,
    });
    return to === s.status ? [] : [{ id: s.id, from: s.status, to }];
  });
}

/** The packages with the changes applied (what the alerts read after a recompute). */
export function withChanges<T extends PlanPackage>(subs: readonly T[], changes: readonly StatusChange[]): T[] {
  const to = new Map(changes.map((c) => [c.id, c.to]));
  return subs.map((s) => ({ ...s, status: to.get(s.id) ?? s.status }));
}

export interface AlertPlan {
  alert: BalanceAlert;
  /** The newest package: the task's subject and the dedup key's id. */
  subscriptionId: string;
  /** Across every package, for packageProgress (its remaining = studentRemaining). */
  used: number;
  total: number;
}

/** R-SUB-02: the alert the student's balance calls for, on the newest package; null for none. */
export function alertPlan(p: StudentPackages & { threshold: number }): AlertPlan | null {
  const newest = p.subs.at(-1);
  if (!newest) return null;
  const balances = p.subs.map((s) => balanceOf(p, s));
  const remaining = studentRemaining(balances);
  const alert = alertFor({ remaining, threshold: p.threshold, status: newest.status });
  if (!alert) return null;
  const used = balances.reduce((n, b) => n + b.lessons_used, 0);
  const total = p.subs.reduce((n, s) => n + s.lessons_total, 0);
  return { alert, subscriptionId: newest.id, used, total };
}

/**
 * R-SUB-02 «flag future lessons»: the newest package is unpaid and nothing is left. Read-time
 * only (setting flag_future_lessons_when_unpaid); a lesson is never cancelled for it.
 */
export function unpaidFlagged(p: StudentPackages): boolean {
  const newest = p.subs.at(-1);
  if (newest?.status !== 'unpaid') return false;
  return studentRemaining(p.subs.map((s) => balanceOf(p, s))) <= 0;
}
