import { z } from 'zod';
import { moneyAmount } from '@ab/money';
import { fromMinor, toMinor, type StopRefund } from './stop-refund.js';

// The stop sheet's money choices (owner 2026-11-06: «for the refund make me choose what I need»).
// No fixed policy: the person stopping the course picks the outcome, the server computes the
// amount from the choice (never trusts a computed amount from the client) and the stop stores what
// the family still owes (subscriptions.stop_owed_amount). A refund never touches the assistant's
// commission. Pure.

/** «إلغاء مع استرداد»: the unattended lessons (default), everything paid, or a custom amount. */
export const STOP_REFUND_CHOICES = ['unattended', 'paid', 'custom'] as const;
export type StopRefundChoice = (typeof STOP_REFUND_CHOICES)[number];

/** «إلغاء فقط»: what the family still owes: attended × rate (default), the price, 0, or custom. */
export const STOP_OWE_CHOICES = ['attended', 'price', 'nothing', 'custom'] as const;
export type StopOweChoice = (typeof STOP_OWE_CHOICES)[number];

/** 0 or a positive amount with at most 2 decimals. */
const amountFromZero = z.union([z.literal(0), moneyAmount]);
const customNeedsAmount = (v: { choice: string; amount?: number | undefined }): boolean =>
  v.choice !== 'custom' || v.amount !== undefined;
const amountMessage = { message: 'custom_amount_required', path: ['amount'] };

/** `refund` of POST course-stop; an old client's `{ amount }` is a custom amount. */
export const stopRefundAskSchema = z
  .strictObject({
    choice: z.enum(STOP_REFUND_CHOICES).default('custom'),
    amount: amountFromZero.optional(),
  })
  .refine(customNeedsAmount, amountMessage);

/** `owe` of POST course-stop (a stop without a refund); absent = attended × rate. */
export const stopOweAskSchema = z
  .strictObject({ choice: z.enum(STOP_OWE_CHOICES), amount: amountFromZero.optional() })
  .refine(customNeedsAmount, amountMessage);
export type StopOweAsk = z.infer<typeof stopOweAskSchema>;

/** The plain stop's numbers (every person who may stop sees them). */
export interface StopOwe {
  /** attended × per-lesson price × rate, never above the price (stopRefund's charge). */
  charged: number;
  price: number;
}

type RefundRule = (calc: StopRefund, custom: number) => number;
const REFUND_BY: Readonly<Record<StopRefundChoice, RefundRule>> = {
  unattended: (calc) => calc.refund,
  paid: (calc) => calc.paid,
  custom: (_calc, custom) => custom,
};

/** The refund a choice asks for (custom: the amount typed). */
export const refundByChoice = (
  choice: StopRefundChoice,
  calc: StopRefund,
  custom = 0,
): number => REFUND_BY[choice](calc, custom);

type OweRule = (owe: StopOwe, custom: number) => number;
const OWE_BY: Readonly<Record<StopOweChoice, OweRule>> = {
  attended: (owe) => owe.charged,
  price: (owe) => owe.price,
  nothing: () => 0,
  custom: (_owe, custom) => custom,
};

/** What a plain stop leaves owed for a choice (custom: the amount typed). */
export const owedByChoice = (choice: StopOweChoice, owe: StopOwe, custom = 0): number =>
  OWE_BY[choice](owe, custom);

/** After a refund the course owes exactly what stays paid: net paid − refund, never below 0. */
export const owedAfterRefund = (calc: StopRefund, refund: number, currency: string): number =>
  fromMinor(Math.max(0, toMinor(calc.paid, currency) - toMinor(refund, currency)), currency);

/** 409 owed_exceeds_price: a custom owed amount outside 0 .. the price. */
export const owedAmountProblem = (
  amount: number,
  price: number,
  currency: string,
): 'owed_exceeds_price' | null =>
  amount < 0 || toMinor(amount, currency) > toMinor(price, currency) ? 'owed_exceeds_price' : null;
