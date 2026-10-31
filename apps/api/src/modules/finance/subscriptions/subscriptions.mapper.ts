import type { BalanceView, Duration, QuoteResponse, StudentBalanceView, SubscriptionView } from '@ab/shared';
import { countsForMoney, livePackages, studentRemaining } from '@ab/shared';
import { emptyBalance, type BalanceRow } from './money/balance.queries';
import type { StudentRef, SubRow } from './subscriptions.queries';

export function studentRef(s: StudentRef | null, fallbackId: string): SubscriptionView['student'] {
  return { id: s?.id ?? fallbackId, code: s?.code ?? '', name: s?.name ?? '' };
}

/**
 * An unused-cancelled package has no balance row (v_subscription_balance, migration 934) and nothing
 * left; a stopped one keeps its row (its held lessons stay on it, migration 991).
 */
function balanceView(sub: SubRow, row: BalanceRow | undefined): BalanceView {
  if (!countsForMoney(sub)) return { ...emptyBalance(sub), remaining: 0 };
  if (!row) return emptyBalance(sub);
  return {
    subscription_id: row.subscription_id,
    lessons_total: row.lessons_total,
    lessons_used: row.lessons_used,
    remaining: row.remaining,
    ended_at: row.ended_at,
    projected_end_at: row.projected_end_at,
  };
}

export interface SubContext {
  balances: ReadonlyMap<string, BalanceRow>;
  paid: ReadonlyMap<string, number>;
}

/** subscriptions row + its v_subscription_balance row + its payments → SubscriptionView. */
export function toSubscriptionView(sub: SubRow, ctx: SubContext): SubscriptionView {
  return {
    id: sub.id,
    student: studentRef(sub.student, sub.student_id),
    package: sub.package === 'trial' ? null : sub.package,
    duration: sub.duration as Duration,
    lessons_total: sub.lessons_total,
    lessons_used_before: sub.lessons_used_before,
    price: Number(sub.price),
    currency: sub.currency,
    fx_rate: sub.fx_rate === null ? null : Number(sub.fx_rate),
    fx_date: sub.fx_date,
    // Written only by the API from PricingService.quote (S2).
    price_source: sub.price_source as unknown as QuoteResponse,
    starts_on: sub.starts_on,
    status: sub.status,
    cancel_kind: sub.cancel_kind,
    renews_on: sub.renews_on,
    notes: sub.notes,
    paid: ctx.paid.get(sub.id) ?? 0,
    balance: balanceView(sub, ctx.balances.get(sub.id)),
    created_at: sub.created_at,
  };
}

/** GET /students/:id/balance: packages oldest first (FIFO), the newest non-cancelled one is `current`. */
export function toStudentBalance(studentId: string, packages: SubscriptionView[]): StudentBalanceView {
  const live = livePackages(packages);
  return {
    student_id: studentId,
    remaining: studentRemaining(live.map((p) => p.balance)),
    current: live.at(-1) ?? null,
    packages,
  };
}
