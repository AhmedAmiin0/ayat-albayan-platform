import type { StopRefund } from './stop-refund.schemas';

// Refund split card-first (Stripe), rest manual; amounts round to ISO 4217 decimals, at most 2.

/** ISO 4217 decimals that differ from 2. */
const ISO_DIGITS: Readonly<Record<string, number>> = {
  KWD: 3,
  OMR: 3,
  BHD: 3,
  JOD: 3,
  JPY: 0,
  KRW: 0,
};
const STORED_DIGITS = 2;

/** 10 ^ the decimals an amount of this currency keeps. */
export const minorScale = (currency: string): number =>
  10 ** Math.min(ISO_DIGITS[currency.toUpperCase()] ?? STORED_DIGITS, STORED_DIGITS);

/** 290.5 SAR → 29050; 1500.4 JPY → 1500 (float noise removed before rounding). */
export const toMinor = (amount: number, currency: string): number =>
  Math.round(Number((amount * minorScale(currency)).toFixed(6)));

export const fromMinor = (minor: number, currency: string): number => minor / minorScale(currency);

/** Percent of the per-lesson price charged per attended lesson on refund, 0-300. */
export const REFUND_RATE_MIN = 0;
export const REFUND_RATE_MAX = 300;

export interface StopRefundInput {
  /** Net paid for the package (payments − refunds), its currency. */
  paid: number;
  price: number;
  lessonsTotal: number;
  /** The lessons the package used (v_subscription_balance.lessons_used, imported ones included). */
  attended: number;
  ratePercent: number;
  currency: string;
}

/**
 * refund = net paid − attended × (price / lessonsTotal) × rate %, floored at 0. The charge is
 * computed on the exact fraction and rounded once, to the minor unit.
 */
export function stopRefund(input: StopRefundInput): StopRefund {
  const { currency } = input;
  const total = Math.max(input.lessonsTotal, 1);
  // Never more lessons than the package holds (a stopped package caps them the same way).
  const attended = Math.min(input.attended, Math.max(input.lessonsTotal, 0));
  const priceMinor = toMinor(input.price, currency);
  // Never above the price (a rate above 100 % never charges beyond the package), as receivables.
  const chargedMinor = Math.min(
    Math.round((attended * priceMinor * input.ratePercent) / (100 * total)),
    Math.max(priceMinor, 0),
  );
  const paidMinor = Math.max(0, toMinor(input.paid, currency));
  return {
    paid: fromMinor(paidMinor, currency),
    perLesson: fromMinor(Math.round(priceMinor / total), currency),
    attended,
    ratePercent: input.ratePercent,
    charged: fromMinor(chargedMinor, currency),
    refund: fromMinor(Math.max(0, paidMinor - chargedMinor), currency),
  };
}

/** A card payment that can still be refunded through Stripe, in the package currency. */
export interface RefundCard {
  id: string;
  refundable: number;
}

export interface RefundSplit {
  cards: { id: string; amount: number }[];
  manual: number;
}

/** Card payments first (in the given order) up to what each can still refund; the rest manual. */
export function splitRefund(input: {
  amount: number;
  cards: readonly RefundCard[];
  currency: string;
}): RefundSplit {
  const { currency } = input;
  let left = Math.max(0, toMinor(input.amount, currency));
  const cards = input.cards.map((card) => {
    const take = Math.min(left, Math.max(0, toMinor(card.refundable, currency)));
    left -= take;
    return { id: card.id, amount: fromMinor(take, currency) };
  });
  return { cards: cards.filter((c) => c.amount > 0), manual: fromMinor(left, currency) };
}

/** Above the allowed maximum or negative; 0 is a stop that refunds nothing. */
export const refundAmountProblem = (
  amount: number,
  allowed: number,
  currency: string,
): 'refund_exceeds_allowed' | null =>
  amount < 0 || toMinor(amount, currency) > toMinor(allowed, currency)
    ? 'refund_exceeds_allowed'
    : null;
