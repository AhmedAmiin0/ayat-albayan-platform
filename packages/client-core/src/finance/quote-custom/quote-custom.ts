import { customTotal, formatAmount, salesPriceFloor, type CustomTotal } from '@ab/shared';

/** What the floor and the field need from GET /pricing/quote. */
export interface QuotedTotal {
  total: number;
  afterDiscount: number;
  currency: string;
}

/** The price «مبلغ مخصص» starts from: the admin's and the sales quote both carry these. */
export type QuotedPrice = Pick<QuotedTotal, 'afterDiscount' | 'currency'>;

/** subscriptions.customPrice's lines and the app's currency name (ر.س …). */
interface Labels {
  min: string;
  invalid: string;
  currency: (iso: string) => string;
}

interface QuoteCustomOpts {
  quote: QuotedTotal | undefined;
  /** The «مبلغ مخصص» toggle and its text (the app's useCustomPrice). */
  typed: { on: boolean; text: string };
  /** subscriptions.write: the admin's package path (the free discount), no floor. */
  admin: boolean;
  labels: Labels;
}

/** Off, or on with a valid amount: what the sheet uses. */
interface QuoteCustomState {
  total: number | undefined;
  valid: boolean;
  error: string | null;
}

type Failure = Extract<CustomTotal, { ok: false }>;

const OFF: QuoteCustomState = { total: undefined, valid: true, error: null };

/** The field's line: not an amount, or under the sales floor («أقل مبلغ مسموح: …»). */
function failureText(failure: Failure, labels: Labels, currency: string): string {
  if (failure.reason === 'invalid') return labels.invalid;
  const amount = formatAmount(failure.min);
  return labels.min.replace('{amount}', amount).replace('{currency}', labels.currency(currency));
}

/** The sales floor of the quote's total; none for the admin or before a quote. */
const floorOf = (o: QuoteCustomOpts): number | null =>
  o.quote === undefined || o.admin ? null : salesPriceFloor(o.quote.total);

/**
 * «مبلغ مخصص» on the chat's «عرض سعر» (owner 2026-11-15), web and mobile. The sales path has the
 * package's floor (salesPriceFloor of the quote's total, as assertSalesPrice); the admin has none.
 * Off: no `total` (the offer is today's), valid, no error. On: `total` once the amount is valid;
 * `valid` gates send, edit and copy; `error` is the field's line, said as soon as it is typed.
 */
export function quoteCustom(o: QuoteCustomOpts): QuoteCustomState {
  if (!o.typed.on) return OFF;
  const check = customTotal(o.typed.text, floorOf(o));
  return check.ok
    ? { total: check.amount, valid: true, error: null }
    : { total: undefined, valid: false, error: failureText(check, o.labels, o.quote?.currency ?? '') };
}
