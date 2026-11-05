import {
  fromMinor,
  owedAmountProblem,
  owedByChoice,
  parseAmountFromZero,
  refundAmountProblem,
  refundByChoice,
  toMinor,
  type CourseStopPreview,
  type CourseStopRequest,
  type StopOweChoice,
  type StopRefund,
  type StopRefundChoice,
} from '@ab/shared';
import type { RefundChoice } from './course-refund.js';

// The stop sheet's money (owner 2026-11-06) for web and mobile: the mode, the chosen option, the
// custom amount typed; what the POST asks, the summary (refund, still owed) and whether it is
// valid. The server computes the same amounts from the choice (StopRefunds / StopOwed).

export interface StopMoneyState {
  mode: RefundChoice;
  refundChoice: StopRefundChoice;
  oweChoice: StopOweChoice;
  /** The custom amount typed (Arabic-Indic digits and «٫» accepted). */
  text: string;
}

/** «إلغاء فقط», the unattended lessons and attended × rate preselected. */
export const STOP_MONEY_START: StopMoneyState = {
  mode: 'cancel',
  refundChoice: 'unattended',
  oweChoice: 'attended',
  text: '',
};

type Ask<C extends string> = { choice: C; amount?: number };
export type StopMoneyAsk = Pick<CourseStopRequest, 'refund' | 'owe'>;

export interface StopMoney {
  ask: StopMoneyAsk;
  summary: { refund: number; due: number };
  valid: boolean;
}

type Preview = Pick<CourseStopPreview, 'paid' | 'owe' | 'currency'>;

/** «إلغاء مع استرداد» is offered with subscriptions.refund and something paid to give back. */
export function offeredRefund(holds: boolean, refund: StopRefund | null | undefined): StopRefund | null {
  return holds && refund && refund.paid > 0 ? refund : null;
}

const typed = (text: string): number | null => (text.trim() === '' ? null : parseAmountFromZero(text));
const isCustom = (choice: string): boolean => choice === 'custom';
/** A custom choice needs an amount typed; a computed one never does. */
const customMissing = (choice: string, custom: number | null): boolean =>
  isCustom(choice) && custom === null;
const askOf = <C extends string>(choice: C, custom: number | null): Ask<C> =>
  isCustom(choice) && custom !== null ? { choice, amount: custom } : { choice };

function refundMoney(state: StopMoneyState, calc: StopRefund, currency: string): StopMoney {
  const custom = typed(state.text);
  const refund = refundByChoice(state.refundChoice, calc, custom ?? 0);
  const problem = refundAmountProblem(refund, calc.paid, currency);
  const valid = !customMissing(state.refundChoice, custom) && problem === null;
  return { ask: { refund: askOf(state.refundChoice, custom) }, summary: { refund, due: 0 }, valid };
}

function oweMoney(state: StopMoneyState, preview: Preview): StopMoney {
  const { currency } = preview;
  const custom = typed(state.text);
  const owed = owedByChoice(state.oweChoice, preview.owe, custom ?? 0);
  const problem = owedAmountProblem(owed, preview.owe.price, currency);
  const valid = !customMissing(state.oweChoice, custom) && problem === null;
  const dueMinor = Math.max(0, toMinor(owed, currency) - toMinor(preview.paid, currency));
  const summary = { refund: 0, due: fromMinor(dueMinor, currency) };
  return { ask: { owe: askOf(state.oweChoice, custom) }, summary, valid };
}

/** The refund path only when it is offered (`breakdown`) and chosen; else «إلغاء فقط». */
export function stopMoney(input: {
  state: StopMoneyState;
  preview: Preview;
  breakdown: StopRefund | null;
}): StopMoney {
  const { state, preview, breakdown } = input;
  const refunding = breakdown !== null && state.mode === 'refund';
  return refunding ? refundMoney(state, breakdown, preview.currency) : oweMoney(state, preview);
}

interface BodyInput {
  subscriptionId: string;
  reason: string;
  clientRequestId: string;
  ask: StopMoneyAsk;
}

/** POST …/course-stop's body: `refund` with «إلغاء مع استرداد», else `owe`. */
export function courseStopBody(input: BodyInput): CourseStopRequest {
  const body = {
    subscriptionId: input.subscriptionId,
    reason: input.reason.trim(),
    clientRequestId: input.clientRequestId,
  };
  return { ...body, ...input.ask };
}
