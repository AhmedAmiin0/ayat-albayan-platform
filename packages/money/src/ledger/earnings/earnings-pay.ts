import { toCents } from '@ab/core';

// The pay dialog's rules, shared by the web dialog and the mobile form (docs/11 §10).

/** What may be paid: the ticked sessions' outstanding, or everything outstanding when none is ticked. */
export function payCeiling(selected: ReadonlyMap<string, { outstanding: number }>, outstanding: number): number {
  if (selected.size === 0) return outstanding;
  return [...selected.values()].reduce((sum, r) => sum + toCents(r.outstanding), 0) / 100;
}

export type AmountProblem = 'required' | 'invalid' | 'overpayment' | null;

/** `amount` is parseAmount's result (null = not a number). More than the ceiling is the API's 409 overpayment, caught early. */
export function amountProblem(input: { amount: number | null; text: string; ceiling: number }): AmountProblem {
  if (input.amount === null) return input.text.trim() ? 'invalid' : 'required';
  if (input.amount <= 0) return 'invalid';
  return toCents(input.amount) > toCents(input.ceiling) ? 'overpayment' : null;
}

/** Ids sent with the payment: the ticks, or none (the API then pays every unpaid session oldest first). */
export const earningIdsOf = (selected: ReadonlyMap<string, unknown>): string[] | undefined =>
  selected.size > 0 ? [...selected.keys()] : undefined;
