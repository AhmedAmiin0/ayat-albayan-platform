import { parseAmount } from '@ab/shared';

/** What the field needs from GET /pricing/quote (useCustomPrice starts from its price). */
export interface QuotedTotal {
  total: number;
  afterDiscount: number;
  currency: string;
}

/** The price «مبلغ مخصص» starts from: the admin's and the sales quote both carry these. */
export type QuotedPrice = Pick<QuotedTotal, 'afterDiscount' | 'currency'>;

/** The «مبلغ مخصص» toggle and its text (the app's useCustomPrice). */
interface Typed {
  on: boolean;
  text: string;
}

/** Off, or on with a valid amount: what the sheet uses. */
interface QuoteCustomState {
  total: number | undefined;
  valid: boolean;
  error: string | null;
}

const OFF: QuoteCustomState = { total: undefined, valid: true, error: null };

/**
 * «مبلغ مخصص» on the chat's «عرض سعر», web and mobile: any positive amount (parseAmount, Arabic
 * digits too) for every role, with no sales floor. Off: no `total` (the offer is today's), valid,
 * no error. On: `total` once the amount is valid; `valid` gates send, edit and copy; `error` is
 * `invalid` (the field's line) as soon as a non-amount is typed.
 */
export function quoteCustom(typed: Typed, invalid: string): QuoteCustomState {
  if (!typed.on) return OFF;
  const amount = parseAmount(typed.text);
  return amount === null
    ? { total: undefined, valid: false, error: invalid }
    : { total: amount, valid: true, error: null };
}
