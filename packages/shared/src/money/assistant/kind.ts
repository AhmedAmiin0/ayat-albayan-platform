import type { SubscriptionStatus } from '../../enums/index.js';

// Renewal commission (owner 2026-10-26, migrations 20261027000750-751): which kind a subscription's commission
// is. Pure twin of subscription_commission_kind: decided by subscription ORDER, never by payment order.

export const ASSISTANT_COMMISSION_KINDS = ['first', 'renewal'] as const;
export type AssistantCommissionKind = (typeof ASSISTANT_COMMISSION_KINDS)[number];

/** Renewals fully paid before this instant never earn (no backfill): 2026-10-27 00:00 Asia/Riyadh. */
export const RENEWAL_CUTOFF = '2026-10-26T21:00:00.000Z';

/** settings.renewal_commission_percent's default: half of the normal commission on each renewal. */
export const DEFAULT_RENEWAL_SHARE = 50;

export interface OrderFact {
  id: string;
  price: number;
  created_at: string;
  /** Absent = a live package. A cancelled one (migration 934) is no kind and never counts as earlier. */
  status?: SubscriptionStatus;
}

const counts = (s: OrderFact): boolean => s.price > 0 && s.status !== 'cancelled';

/** created_at, then id (uuid order = lowercase hex order). */
const before = (a: OrderFact, b: OrderFact): boolean =>
  Date.parse(a.created_at) < Date.parse(b.created_at) || (Date.parse(a.created_at) === Date.parse(b.created_at) && a.id < b.id);

/**
 * 'first' when no other priced subscription of the student was created earlier, else 'renewal'; null for a
 * free one (a trial never counts), a cancelled one or an unknown id. A row already earned keeps its kind: this decides new rows.
 */
export function commissionKindOf(subs: readonly OrderFact[], id: string): AssistantCommissionKind | null {
  const sub = subs.find((s) => s.id === id);
  if (!sub || !counts(sub)) return null;
  return subs.some((o) => o.id !== id && counts(o) && before(o, sub)) ? 'renewal' : 'first';
}

export const isCommissionKind = (v: string): v is AssistantCommissionKind => v === 'first' || v === 'renewal';
