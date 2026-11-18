import { formatAmount } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';

// Money as text on both apps' screens. Wording from ar.json, Western digits (docs/07 §2).

const symbols: Readonly<Record<string, string>> = {
  ...t.pricing.currencies,
  EGP: t.payouts.currency,
};

/** The currency's Arabic symbol («ر.س», «ج.م»), else its ISO code. */
export function currencySymbol(iso: string): string {
  return symbols[iso] ?? iso;
}

/** «145 ر.س» as plain text (aria labels, CSV-free places). */
export function moneyText(amount: number, currency: string): string {
  return `${formatAmount(amount)} ${currencySymbol(currency)}`;
}
