import { formatAmount, partPaidOf, type OwedPackage } from '@ab/money';
import { t } from '@ab/web-kit';
import { currencySymbol } from './format';

// The part-paid wording (why is this unpaid): a package stays 'unpaid' until the
// net paid reaches its price; these lines say how far it is. Western digits, the currency's symbol.

/** Only while 0 < paid < owed (the price, or a stopped course's stored decision), else null. */
export function partPaidText(s: OwedPackage & { paid: number; currency: string }): string | null {
  const part = partPaidOf(s);
  if (!part) return null;
  return t.packagePayment.partPaid
    .replace('{paid}', formatAmount(part.paid))
    .replace('{price}', formatAmount(part.price))
    .replace('{currency}', currencySymbol(s.currency))
    .replace('{due}', formatAmount(part.due));
}
