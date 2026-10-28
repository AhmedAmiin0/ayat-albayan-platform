import { formatAmount, partPaid } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { currencySymbol } from './format';

// The part-paid wording (owner 2026-10-28, «Why is this unpaid»): a package stays 'unpaid' until the
// net paid reaches its price; these lines say how far it is. Western digits, the currency's symbol.

/** «مدفوعة جزئيًا: 80 من 81 ر.س · الباقي 1» while 0 < paid < price (partPaid), else null. */
export function partPaidText(s: { paid: number; price: number; currency: string }): string | null {
  const part = partPaid(s);
  if (!part) return null;
  return t.packagePayment.partPaid
    .replace('{paid}', formatAmount(part.paid))
    .replace('{price}', formatAmount(part.price))
    .replace('{currency}', currencySymbol(s.currency))
    .replace('{due}', formatAmount(part.due));
}
