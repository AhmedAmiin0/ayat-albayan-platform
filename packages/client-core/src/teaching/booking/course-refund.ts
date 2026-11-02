import { refundAmountProblem, type CourseStopRequest, type StopRefund } from '@ab/shared';

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

const DIGITS = /^\d+(?:[.,]\d{1,3})?$/;

/**
 * The amount the field holds (Western or Arabic-Indic digits, «.» or «,»); empty = the computed
 * refund. null = not a positive amount up to the computed refund.
 */
export function refundAmountOf(
  text: string,
  input: { max: number; currency: string },
): number | null {
  const western = text.trim().replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  const typed = western === '' ? String(input.max) : western;
  const amount = DIGITS.test(typed) ? Number(typed.replace(',', '.')) : Number.NaN;
  const bad =
    Number.isNaN(amount) || refundAmountProblem(amount, input.max, input.currency) !== null;
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
