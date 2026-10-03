import { cents, parseAmount } from '@ab/shared';

export type AmountProblem = 'required' | 'invalid' | 'over';

/** Client-side mirror of the API: > 0, ≤ 2 decimals (shared parseAmount), never above what is due. */
export function checkAmount(text: string, due: number): { amount: number } | { problem: AmountProblem } {
  if (!text.trim()) return { problem: 'required' };
  const amount = parseAmount(text);
  if (amount === null) return { problem: 'invalid' };
  return cents(amount) > cents(due) ? { problem: 'over' } : { amount };
}
