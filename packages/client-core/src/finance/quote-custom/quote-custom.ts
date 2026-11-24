import { parseAmount } from '@ab/money';

/** What the field needs from GET /pricing/quote (useCustomPrice starts from its price). */
export interface QuotedTotal {
  total: number;
  afterDiscount: number;
  currency: string;
}

/** Both the admin and the sales quote carry these fields. */
export type QuotedPrice = Pick<QuotedTotal, 'afterDiscount' | 'currency'>;

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

/** Custom price: any positive amount for every role, no sales floor; off means today's offer. */
export function quoteCustom(typed: Typed, invalid: string): QuoteCustomState {
  if (!typed.on) return OFF;
  const amount = parseAmount(typed.text);
  return amount === null
    ? { total: undefined, valid: false, error: invalid }
    : { total: amount, valid: true, error: null };
}
