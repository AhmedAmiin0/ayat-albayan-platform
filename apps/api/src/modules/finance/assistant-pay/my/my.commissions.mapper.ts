import type { PaymentKind, PaymentMethod, PayoutStatus } from '@ab/catalog';
import {
  walletState,
  WALLET_VOID_REASONS,
  type AssistantCommissionStatus,
  type MyCommissionRow,
  type WalletVoidReason,
} from '@ab/money';

/** A commission row as selected; never the price, the base amount or the actors. */
export const MY_COMMISSION_SELECT =
  'id, kind, share_percent, amount, currency, earned_at, status, void_reason, student:students(code, name), statement:assistant_statements(status, month), subscription:subscriptions(payments(method, kind, paid_at))';

interface PaymentFact { method: PaymentMethod; kind: PaymentKind; paid_at: string }

export interface MyCommissionSource {
  id: string;
  kind: string;
  share_percent: number;
  amount: number;
  currency: string;
  earned_at: string;
  status: AssistantCommissionStatus;
  void_reason: string | null;
  student: { code: string | null; name: string } | null;
  statement: { status: PayoutStatus; month: string } | null;
  /** Null once the package is gone (a voided row may have lost it). */
  subscription: { payments: PaymentFact[] } | null;
}

/**
 * How the package was paid: the payment that completed it, i.e. the latest payment (never a refund) paid at
 * or before earned_at (= subscription_full_at, the paid_at of that payment). Null when there is none.
 */
export function paidVia(earnedAt: string, payments: readonly PaymentFact[]): PaymentMethod | null {
  const at = Date.parse(earnedAt);
  let best: PaymentFact | null = null;
  for (const p of payments) {
    const when = Date.parse(p.paid_at);
    if (p.kind !== 'payment' || when > at) continue;
    if (!best || when >= Date.parse(best.paid_at)) best = p;
  }
  return best?.method ?? null;
}

/** Only database-written codes pass; an admin-typed reason never leaves (migration 271). */
const voidCode = (reason: string | null): WalletVoidReason | null =>
  WALLET_VOID_REASONS.find((c) => c === reason) ?? null;

export function toMyCommission(r: MyCommissionSource): MyCommissionRow {
  const state = walletState(r.status, r.statement?.status ?? null);
  return {
    id: r.id,
    student: { code: r.student?.code ?? '', name: r.student?.name ?? '' },
    kind: r.kind === 'renewal' ? 'renewal' : 'first',
    share_percent: Number(r.share_percent),
    amount: Number(r.amount),
    currency: r.currency,
    earned_at: r.earned_at,
    method: paidVia(r.earned_at, r.subscription?.payments ?? []),
    state,
    statement_month: state === 'in_statement' || state === 'paid' ? (r.statement?.month ?? null) : null,
    void_reason: state === 'voided' ? voidCode(r.void_reason) : null,
  };
}
