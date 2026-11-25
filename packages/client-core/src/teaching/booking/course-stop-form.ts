import type { StopMoney } from './course-stop-money';

// The reason error shows only after confirm; a custom amount out of range shows as typed.

export type StopMoneyProblem = NonNullable<StopMoney['problem']> | 'amount_required';

export interface StopFormInput {
  money: StopMoney | null;
  /** The custom amount typed (`StopMoneyState.text`). */
  text: string;
  reason: string;
  tried: boolean;
}

export interface StopFormCheck {
  /** The money line's `t.courseActions.errors` key, or null. */
  money: StopMoneyProblem | null;
  reason: boolean;
  /** The confirm may not run. */
  blocked: boolean;
}

/** The shortest reason the API takes (courseStopSchema). */
const REASON_MIN = 2;

const chosen = (money: StopMoney): string | undefined =>
  money.ask.refund?.choice ?? money.ask.owe?.choice;
const emptyCustom = (money: StopMoney, text: string): boolean =>
  chosen(money) === 'custom' && text.trim() === '';

const moneyProblem = (input: StopFormInput): StopMoneyProblem | null => {
  const { money, text, tried } = input;
  if (!money || money.valid) return null;
  if (emptyCustom(money, text)) return tried ? 'amount_required' : null;
  return money.problem;
};

export function stopFormCheck(input: StopFormInput): StopFormCheck {
  const short = input.reason.trim().length < REASON_MIN;
  const valid = input.money?.valid === true;
  return {
    money: moneyProblem(input),
    reason: input.tried && short,
    blocked: short || !valid,
  };
}
