import { formatAmount } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';

// Money as text on both apps' screens. Wording from ar.json, Western digits (docs/07 §2).

const symbols: Readonly<Record<string, string>> = {
  ...t.pricing.currencies,
  EGP: t.payouts.currency,
};

/** The currency's Arabic symbol, else its ISO code. */
export function currencySymbol(iso: string): string {
  return symbols[iso] ?? iso;
}

/** Plain text for aria labels and similar places. */
export function moneyText(amount: number, currency: string): string {
  return `${formatAmount(amount)} ${currencySymbol(currency)}`;
}
