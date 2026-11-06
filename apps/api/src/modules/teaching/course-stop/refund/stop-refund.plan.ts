import {
  owedAfterRefund,
  refundByChoice,
  replayRefund,
  toMinor,
  type RefundSplit,
  type StopRefund,
  type StopRefundChoice,
} from '@ab/shared';
import { conflict } from '@/common/http/errors';
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
  /** The amount the choice asks (at most calc.paid). */
  amount: number;
  /** Card first (Stripe), the rest manual. */
  split: RefundSplit;
  /** What the stopped course is owed for after it: the net paid left (stop_owed_amount). */
  owed: OwedDecision;
}

/** The stop's stored decision (subscriptions.stop_owed_amount / stop_owed_choice). */
export interface OwedDecision {
  amount: number;
  choice: string;
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

/** The refund the person chose in the sheet (owner 2026-11-06); custom carries its amount. */
export interface RefundChoiceAsk {
  choice: StopRefundChoice;
  amount?: number | undefined;
}

interface DecisionIn {
  ask: RefundChoiceAsk;
  calc: StopRefund;
  /** What the stop with this request already stored (a replay); null before it commits. */
  stored: OwedDecision | null;
  currency: string;
}
interface Decision {
  amount: number;
  owed: OwedDecision;
}

const choiceOf = (ask: RefundChoiceAsk): string => `refund_${ask.choice}`;

function fresh({ ask, calc, currency }: DecisionIn): Decision {
  const amount = refundByChoice(ask.choice, calc, ask.amount ?? 0);
  const owed = { amount: owedAfterRefund(calc, amount, currency), choice: choiceOf(ask) };
  return { amount, owed };
}

/** A retry asking another decision than the stored one (another option, another typed amount). */
function asksOther(input: DecisionIn & { stored: OwedDecision }, amount: number): boolean {
  const { ask, stored, currency } = input;
  const minor = (n: number) => toMinor(n, currency);
  const typed = ask.choice === 'custom' && minor(ask.amount ?? 0) !== minor(amount);
  return stored.choice !== choiceOf(ask) || typed;
}

function replayed(input: DecisionIn & { stored: OwedDecision }): Decision {
  const amount = replayRefund(input.calc.paid, input.stored.amount, input.currency);
  if (asksOther(input, amount)) throw conflict('stop_mismatch');
  return { amount, owed: input.stored };
}

/**
 * The refund and what stays owed. A stop that already committed (a retry after Stripe failed or a
 * crash) re-plans its STORED decision, never live lessons or the live rate (review 2026-11-06):
 * the net paid with this stop's own refunds left out − stop_owed_amount; 409 stop_mismatch when
 * the retry asks another decision.
 */
export const refundDecision = (input: DecisionIn): Decision =>
  input.stored ? replayed({ ...input, stored: input.stored }) : fresh(input);
