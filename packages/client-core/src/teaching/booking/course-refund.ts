import type { StopOwe, StopOweChoice, StopRefund, StopRefundChoice } from '@ab/shared';

// Words and the money format are injected by each app.

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

/** These choices go below the default (custom may go under attended times rate). */
const LOWERING: ReadonlySet<StopOweChoice> = new Set<StopOweChoice>(['nothing', 'custom']);

/**
 * The owe options this person is offered: forgiving money below attended ×
 * rate is a refund holder's call on this student (the server answers 403 otherwise).
 */
export function offeredOwe<O extends Option<StopOweChoice>>(options: O[], mayLower: boolean): O[] {
  return options.filter((o) => mayLower || !LOWERING.has(o.value));
}

export function stopSummaryText(
  words: Pick<StopChoiceWords, 'summary'>,
  summary: { refund: number; due: number },
  money: Money,
): string {
  return words.summary
    .replace('{refund}', money(summary.refund))
    .replace('{due}', money(summary.due));
}
