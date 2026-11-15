import { customTotal, formatAmount, salesPriceFloor, type CustomTotal } from '@ab/shared';

/** What the floor and the field need from GET /pricing/quote. */
export interface QuotedTotal {
  total: number;
  afterDiscount: number;
  currency: string;
}

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

/** The field's line: not an amount, or under the sales floor («أقل مبلغ مسموح: …»). */
function errorOf(check: CustomTotal, labels: Labels, currency: string): string | null {
  if (check.ok) return null;
  const min = (n: number) =>
    labels.min.replace('{amount}', formatAmount(n)).replace('{currency}', labels.currency(currency));
  return check.reason === 'below' ? min(check.min) : labels.invalid;
}

/**
 * «مبلغ مخصص» on the chat's «عرض سعر» (owner 2026-11-15), web and mobile. The sales path has the
 * package's floor (salesPriceFloor of the quote's total, as assertSalesPrice); the admin has none.
 * Off: no `total` (the offer is today's), valid, no error. On: `total` once the amount is valid;
 * `valid` gates send, edit and copy; `error` is the field's line, said as soon as it is typed.
 */
export function quoteCustom(o: QuoteCustomOpts) {
  const floored = o.quote !== undefined && !o.admin;
  const check = customTotal(o.typed.text, floored && o.quote ? salesPriceFloor(o.quote.total) : null);
  const on = o.typed.on;
  return {
    total: on && check.ok ? check.amount : undefined,
    valid: !on || check.ok,
    error: on ? errorOf(check, o.labels, o.quote?.currency ?? '') : null,
  };
}
