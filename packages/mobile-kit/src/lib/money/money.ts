import { formatAmount } from '@ab/shared';
import { t } from '../i18n/i18n';
import { ltr } from '../../ui/primitives/Ltr';

// Money lines both apps write (docs/07 §2: Western digits, LTR values isolated); moved from the
// staff app's money format for the family app's package (docs/50 §7).

const currencyNames: Record<string, string | undefined> = t.pricing.currencies;

/** «ر.س» for the site currencies, else the isolated ISO code («EGP»). */
export function currencyName(currency: string): string {
  return currencyNames[currency] ?? ltr(currency);
}

/** «145 ر.س»: the isolated amount, then the currency. */
export function money(amount: number, currency: string): string {
  return `${ltr(formatAmount(amount))} ${currencyName(currency)}`;
}
