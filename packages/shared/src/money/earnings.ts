// Per-session teacher earnings (migrations 176-179). Money is compared in piasters (integers):
// numeric(12,2) comes back from the API as a JS number and 0.1 + 0.2 must not break a balance.

export const EARNING_STATUSES = ['earned', 'partially_paid', 'paid'] as const;
export type EarningStatus = (typeof EARNING_STATUSES)[number];

export interface EarningMoney {
  amount: number;
  paid_amount: number;
}

export const toCents = (v: number): number => Math.round(v * 100);
export const fromCents = (c: number): number => c / 100;

/** What is still owed for one session; 0 (never negative) when a correction left it overpaid. */
export function outstanding(e: EarningMoney): number {
  return fromCents(Math.max(0, toCents(e.amount) - toCents(e.paid_amount)));
}

/** Same rule as public.earning_status (migration 177). */
export function earningStatus(e: EarningMoney): EarningStatus {
  if (toCents(e.paid_amount) >= toCents(e.amount)) return 'paid';
  return e.paid_amount > 0 ? 'partially_paid' : 'earned';
}

export interface EarningsBalance {
  earned: number;
  paid: number;
  outstanding: number;
  /** Paid above a session's corrected amount; shown apart, never netted against other sessions. */
  overpaid: number;
  sessions: number;
  unpaid_sessions: number;
}

/** The three cards: earned (all counted sessions), paid (money out), outstanding (still owed). */
export function balanceOf(rows: readonly EarningMoney[]): EarningsBalance {
  let earned = 0;
  let paid = 0;
  let owed = 0;
  let over = 0;
  let unpaid = 0;
  for (const r of rows) {
    const diff = toCents(r.amount) - toCents(r.paid_amount);
    earned += toCents(r.amount);
    paid += toCents(r.paid_amount);
    owed += Math.max(0, diff);
    over += Math.max(0, -diff);
    if (diff > 0) unpaid += 1;
  }
  return {
    earned: fromCents(earned),
    paid: fromCents(paid),
    outstanding: fromCents(owed),
    overpaid: fromCents(over),
    sessions: rows.length,
    unpaid_sessions: unpaid,
  };
}

export interface Allocatable extends EarningMoney {
  id: string;
  starts_at: string;
}
export interface AllocationItem {
  earning_id: string;
  amount: number;
}
export type AllocationError = 'invalid_amount' | 'nothing_outstanding' | 'overpayment';
export type Allocation = { ok: true; items: AllocationItem[] } | { ok: false; error: AllocationError };

/**
 * Spreads a payment over the given sessions, oldest lesson first (ties by id), each up to what it
 * still owes. A partial amount leaves the newest sessions untouched; more than the total
 * outstanding of the chosen sessions is refused (`overpayment`), never carried over.
 */
export function allocatePayment(input: { amount: number; earnings: readonly Allocatable[] }): Allocation {
  let left = toCents(input.amount);
  if (!Number.isFinite(left) || left <= 0) return { ok: false, error: 'invalid_amount' };
  const open = input.earnings
    .filter((e) => outstanding(e) > 0)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id.localeCompare(b.id));
  if (open.length === 0) return { ok: false, error: 'nothing_outstanding' };
  const items: AllocationItem[] = [];
  for (const e of open) {
    if (left === 0) break;
    const take = Math.min(left, toCents(outstanding(e)));
    items.push({ earning_id: e.id, amount: fromCents(take) });
    left -= take;
  }
  return left > 0 ? { ok: false, error: 'overpayment' } : { ok: true, items };
}
