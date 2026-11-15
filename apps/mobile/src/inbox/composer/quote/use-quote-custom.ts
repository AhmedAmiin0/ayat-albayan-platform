import { customTotal, formatAmount, salesPriceFloor, type CustomTotal } from '@ab/shared';
import { t, usePermissions } from '@ab/mobile-kit';
import { currencyName } from '@/payments';
import { useCustomPrice } from '@/subscribe';

/** What the floor and the field need from GET /pricing/quote. */
interface QuotedTotal {
  total: number;
  afterDiscount: number;
  currency: string;
}

const c = t.subscriptions.customPrice;

const minLine = (min: number, currency: string): string =>
  c.min.replace('{amount}', formatAmount(min)).replace('{currency}', currencyName(currency));

/** The field's line: not an amount, or under the sales floor («أقل مبلغ مسموح: …»). */
function errorOf(check: CustomTotal, currency: string): string | undefined {
  if (check.ok) return undefined;
  return check.reason === 'below' ? minLine(check.min, currency) : c.invalid;
}

/**
 * «مبلغ مخصص» on the chat's «عرض سعر» (owner 2026-11-15), the package form's field (useCustomPrice).
 * The sales path has the package's floor (salesPriceFloor of the quote's total); the admin's,
 * subscriptions.write (the package form with the free discount), has none. Off: no `total`, so the
 * offer is today's; on: `total` is the typed amount once valid, and `valid` gates send/edit/copy.
 */
export function useQuoteCustom(quote: QuotedTotal | undefined) {
  const can = usePermissions();
  const custom = useCustomPrice(quote);
  const floored = quote !== undefined && !can('subscriptions.write');
  const check = customTotal(custom.text, floored ? salesPriceFloor(quote.total) : null);
  const valid = !custom.on || check.ok;
  return {
    price: { ...custom, error: custom.on ? errorOf(check, quote?.currency ?? '') : undefined },
    total: custom.on && check.ok ? check.amount : undefined,
    valid,
  };
}
