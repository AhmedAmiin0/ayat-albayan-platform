import { SUBSCRIPTION_STATUSES, type SalesHistoryEntry, type SalesSubscriptionHistory, type SubscriptionStatus } from '@ab/shared';
import type { HistoryAuditRow, HistoryBundle, HistorySubscriptionRow } from './sales-history.queries';

const asStatus = (v: string | null): SubscriptionStatus | null => SUBSCRIPTION_STATUSES.find((s) => s === v) ?? null;

/** The audit rows that moved the status (a create counts: from null), oldest first; any other edit is dropped. */
export function statusChanges(rows: readonly HistoryAuditRow[]): SalesHistoryEntry['status_changes'] {
  return rows
    .map((r) => ({ at: r.at, from: asStatus(r.before_status), to: asStatus(r.after_status) }))
    .filter((c) => c.to !== null && c.from !== c.to);
}

function entry(sub: HistorySubscriptionRow, b: HistoryBundle): SalesHistoryEntry {
  const balance = b.balances.find((x) => x.subscription_id === sub.id);
  const used = balance?.lessons_used ?? 0;
  return {
    id: sub.id,
    package: sub.package,
    status: sub.status,
    starts_on: sub.starts_on,
    renews_on: sub.renews_on,
    ended_at: balance?.ended_at ?? null,
    created_at: sub.created_at,
    lessons_total: sub.lessons_total,
    lessons_used: used,
    lessons_remaining: balance?.remaining ?? Math.max(sub.lessons_total - used, 0),
    status_changes: statusChanges(b.audit.filter((a) => a.entity_id === sub.id)),
    payments: b.payments
      .filter((p) => p.subscription_id === sub.id)
      .map((p) => ({ id: p.id, paid_at: p.paid_at, kind: p.kind, amount: p.amount, currency: p.currency })),
  };
}

/** Whitelist of the history: payments carry amount + currency (owner 2026-10-11); no price, fx, note, method or receipt. */
export function toSalesHistory(subscriptionId: string, b: HistoryBundle): SalesSubscriptionHistory {
  return {
    subscription_id: subscriptionId,
    student: { id: b.student.id, code: b.student.code ?? '', name: b.student.name },
    subscriptions: b.subscriptions.map((s) => entry(s, b)),
  };
}
