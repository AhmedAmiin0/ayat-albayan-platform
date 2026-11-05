import {
  parseAmount,
  refundAmountProblem,
  type CourseStopRequest,
  type StopRefund,
} from '@ab/shared';

// «إلغاء فقط» / «إلغاء مع استرداد» (owner 2026-11-02) for web and mobile: the sheet's refund lines,
// the amount typed (lowered, never above the computed refund) and the POST body. Words and the
// money format are injected (each app's `t.courseActions.stop`, its own money()).

export type RefundChoice = 'cancel' | 'refund';

/** `t.courseActions.stop`'s refund lines. */
export interface StopRefundWords {
  refundPaid: string;
  refundCharged: string;
  refundTotal: string;
}

type Money = (amount: number) => string;

/** «المدفوع», «الحلقات المحضورة: n × السعر × النسبة = …», «المبلغ المستحق للاسترداد». */
export function stopRefundLines(
  words: StopRefundWords,
  refund: StopRefund,
  money: Money,
): string[] {
  const charged = words.refundCharged
    .replace('{n}', String(refund.attended))
    .replace('{price}', money(refund.perLesson))
    .replace('{rate}', String(refund.ratePercent))
    .replace('{amount}', money(refund.charged));
  return [
    words.refundPaid.replace('{amount}', money(refund.paid)),
    charged,
    words.refundTotal.replace('{amount}', money(refund.refund)),
  ];
}

/**
 * The amount the field holds (parseAmount: Arabic-Indic digits, «٫», at most 2 decimals, «1,500»
 * refused); empty = the computed refund. null = not a positive amount up to the computed refund.
 */
export function refundAmountOf(
  text: string,
  input: { max: number; currency: string },
): number | null {
  const amount = text.trim() === '' ? input.max : parseAmount(text);
  const bad = amount === null || refundAmountProblem(amount, input.max, input.currency) !== null;
  return bad ? null : amount;
}

/** The sheet's state: «إلغاء فقط» = no refund (valid); «إلغاء مع استرداد» = the typed amount. */
export function stopRefundOf(input: {
  choice: RefundChoice;
  text: string;
  refund: { max: number; currency: string };
}): { refund: number | null; valid: boolean } {
  const amount = input.choice === 'refund' ? refundAmountOf(input.text, input.refund) : null;
  return { refund: amount, valid: input.choice === 'cancel' || amount !== null };
}

/** The refund lines when «إلغاء مع استرداد» is offered: the key and something to refund. */
function offeredRefund(holds: boolean, refund: StopRefund | null | undefined): StopRefund | null {
  return holds && refund && refund.refund > 0 ? refund : null;
}

/** What the sheet offers and asks: «إلغاء فقط» whenever the refund is not offered. */
export function refundOffer(input: {
  holds: boolean;
  refund: StopRefund | null | undefined;
  currency: string;
  choice: RefundChoice;
  text: string;
}): { breakdown: StopRefund | null; asked: { refund: number | null; valid: boolean } } {
  const breakdown = offeredRefund(input.holds, input.refund);
  const max = { max: breakdown?.refund ?? 0, currency: input.currency };
  const choice = breakdown ? input.choice : 'cancel';
  return { breakdown, asked: stopRefundOf({ choice, text: input.text, refund: max }) };
}

interface BodyInput {
  subscriptionId: string;
  reason: string;
  clientRequestId: string;
  /** null = «إلغاء فقط». */
  refund: number | null;
}

/** POST …/course-stop's body: `refund` only with «إلغاء مع استرداد». */
export function courseStopBody(input: BodyInput): CourseStopRequest {
  const body = {
    subscriptionId: input.subscriptionId,
    reason: input.reason.trim(),
    clientRequestId: input.clientRequestId,
  };
  return input.refund === null ? body : { ...body, refund: { amount: input.refund } };
}
