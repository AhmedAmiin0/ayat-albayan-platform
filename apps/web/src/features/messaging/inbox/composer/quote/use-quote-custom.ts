import { customTotal, formatAmount, salesPriceFloor, type CustomTotal } from '@ab/shared';
import { currencySymbol, useCustomPrice } from '@/features/finance/subscriptions';
import { usePermissions } from '@/features/people/auth';
import { t } from '@/lib/i18n/i18n';

/** What the floor and the field need from GET /pricing/quote. */
interface QuotedTotal {
  total: number;
  afterDiscount: number;
  currency: string;
}

const T = t.subscriptions.customPrice;

const minLine = (min: number, currency: string): string =>
  T.min.replace('{amount}', formatAmount(min)).replace('{currency}', currencySymbol(currency));

/** The field's line: not an amount, or under the sales floor («أقل مبلغ مسموح: …»). */
function errorOf(check: CustomTotal, currency: string): string | null {
  if (check.ok) return null;
  return check.reason === 'below' ? minLine(check.min, currency) : T.invalid;
}

/**
 * «مبلغ مخصص» on the chat's «عرض سعر» (owner 2026-11-15), the package form's field (useCustomPrice),
 * its error said as soon as it is typed. The sales path has the package's floor (salesPriceFloor of
 * the quote's total); the admin's, subscriptions.write (the package form with the free discount),
 * has none. Off: no `total`, so the offer is today's; on: `total` is the typed amount once valid,
 * and `valid` gates send, edit and copy.
 */
export function useQuoteCustom(quote: QuotedTotal | undefined) {
  const { can } = usePermissions();
  const custom = useCustomPrice({ quote, active: true });
  const floored = quote !== undefined && !can('subscriptions.write');
  const check = customTotal(custom.text, floored ? salesPriceFloor(quote.total) : null);
  return {
    price: { ...custom, error: custom.on ? errorOf(check, quote?.currency ?? '') : null },
    total: custom.on && check.ok ? check.amount : undefined,
    valid: !custom.on || check.ok,
  };
}
