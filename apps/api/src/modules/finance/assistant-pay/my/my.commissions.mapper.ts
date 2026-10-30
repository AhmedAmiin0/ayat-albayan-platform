import {
  walletState,
  WALLET_VOID_REASONS,
  type AssistantCommissionStatus,
  type MyCommissionRow,
  type PaymentKind,
  type PaymentMethod,
  type PayoutStatus,
  type WalletVoidReason,
} from '@ab/shared';

/**
 * A row of «عمولاتي» as the select returns it: the student (code, name), the statement it sits in and the
 * package's payments (for how it was paid). Never the price, the base amount or the actors.
 */
export const MY_COMMISSION_SELECT =
  'id, kind, share_percent, amount, currency, earned_at, status, void_reason, student:students(code, name), statement:assistant_statements(status, month), subscription:subscriptions(payments(method, kind, paid_at))';

type PaymentFact = { method: PaymentMethod; kind: PaymentKind; paid_at: string };

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

/**
 * Only a code the database writes itself (payment_voided, student_merged); anything else is a reason an
 * admin typed, which migration 271 keeps from sales, so it never leaves: the app says «ألغتها الإدارة».
 */
const voidCode = (reason: string | null): WalletVoidReason | null => WALLET_VOID_REASONS.find((c) => c === reason) ?? null;

/** One entry of «عمولاتي»: a whitelist (MyCommissionRow), its wallet state and the statement month when frozen. */
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
