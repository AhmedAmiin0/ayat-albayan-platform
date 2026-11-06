import type { StopOwe, StopOweChoice, StopRefund, StopRefundChoice } from '@ab/shared';

// «إلغاء فقط» / «إلغاء مع استرداد» (owner 2026-11-02, choices 2026-11-06) for web and mobile: the
// sheet's lines and option labels with their computed amounts. Words and the money format are
// injected (each app's `t.courseActions.stop`, its own money()).

/** The sheet's mode: «إلغاء فقط» or «إلغاء مع استرداد». */
export type RefundChoice = 'cancel' | 'refund';

/** `t.courseActions.stop`'s refund lines. */
export interface StopRefundWords {
  refundPaid: string;
  refundCharged: string;
}

/** `t.courseActions.stop`'s option labels and the summary line. */
export interface StopChoiceWords {
  refundUnattended: string;
  refundAll: string;
  refundCustom: string;
  oweAttended: string;
  owePrice: string;
  oweNothing: string;
  oweCustom: string;
  summary: string;
}

type Money = (amount: number) => string;
interface Option<V extends string> {
  value: V;
  label: string;
}

/** «المدفوع», «الحلقات المحضورة: n × السعر × النسبة = …». */
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
  return [words.refundPaid.replace('{amount}', money(refund.paid)), charged];
}

const withAmount = (word: string, amount: string): string => word.replace('{amount}', amount);

/** The refund options, the computed amount next to the first two (unattended is the default). */
export function refundOptions(
  words: StopChoiceWords,
  calc: StopRefund,
  money: Money,
): Option<StopRefundChoice>[] {
  return [
    { value: 'unattended', label: withAmount(words.refundUnattended, money(calc.refund)) },
    { value: 'paid', label: withAmount(words.refundAll, money(calc.paid)) },
    { value: 'custom', label: words.refundCustom },
  ];
}

/** What a plain stop leaves owed (attended × rate is the default), amounts shown. */
export function oweOptions(
  words: StopChoiceWords,
  owe: StopOwe,
  money: Money,
): Option<StopOweChoice>[] {
  return [
    { value: 'attended', label: withAmount(words.oweAttended, money(owe.charged)) },
    { value: 'price', label: withAmount(words.owePrice, money(owe.price)) },
    { value: 'nothing', label: words.oweNothing },
    { value: 'custom', label: words.oweCustom },
  ];
}

/** «إلغاء فقط» below the default (nothing; custom may go under attended × rate). */
const LOWERING: ReadonlySet<StopOweChoice> = new Set<StopOweChoice>(['nothing', 'custom']);

/**
 * The owe options this person is offered (review 2026-11-06): forgiving money below attended ×
 * rate is a refund holder's call on this student (the server answers 403 otherwise).
 */
export function offeredOwe<O extends Option<StopOweChoice>>(options: O[], mayLower: boolean): O[] {
  return options.filter((o) => mayLower || !LOWERING.has(o.value));
}

/** «الاسترداد: … · المتبقي على الأسرة: …» before the confirm. */
export function stopSummaryText(
  words: Pick<StopChoiceWords, 'summary'>,
  summary: { refund: number; due: number },
  money: Money,
): string {
  return words.summary
    .replace('{refund}', money(summary.refund))
    .replace('{due}', money(summary.due));
}
