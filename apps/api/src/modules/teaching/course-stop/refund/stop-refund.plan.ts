import { toMinor, type RefundSplit, type StopRefund } from '@ab/shared';
import { uuidFor } from '@/modules/finance/stripe';
import type { CardState } from './stop-refund.cards';
import type { MoneyRow, RefundPackage } from './stop-refund.repo';

/** The package a refund is planned for. */
export interface RefundSub {
  id: string;
  studentId: string;
  currency: string;
}

/** What one stop may refund and where it would go. */
export interface RefundPlan {
  sub: RefundSub;
  pkg: RefundPackage;
  calc: StopRefund;
  cards: CardState[];
  rows: MoneyRow[];
  requestId: string;
  /** The amount asked (at most calc.refund). */
  amount: number;
  /** Card first (Stripe), the rest manual. */
  split: RefundSplit;
}

/** The manual refund row's client_request_id: one per stop (rule 8). */
export const manualRefundKey = (requestId: string): string =>
  uuidFor(`course-stop-refund:${requestId}`);

/**
 * A replay of the same stop asking another split than the one already (partly) refunded: a card
 * this stop refunded for another amount, or a manual row of another amount (409 refund_mismatch).
 */
export function replayMismatch(input: {
  cards: readonly CardState[];
  split: RefundSplit;
  manualRow: number | null;
  currency: string;
}): boolean {
  const minor = (n: number) => toMinor(n, input.currency);
  const take = new Map(input.split.cards.map((leg) => [leg.id, minor(leg.amount)]));
  const cardOff = input.cards.some((card) => {
    const done = minor(card.mine.reduce((n, r) => n + r.amount, 0));
    return card.mine.length > 0 && done !== (take.get(card.paymentId) ?? 0);
  });
  const manualOff =
    input.manualRow !== null && minor(input.manualRow) !== minor(input.split.manual);
  return cardOff || manualOff;
}
