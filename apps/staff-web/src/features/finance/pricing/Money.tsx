import { formatAmount, type CurrencyIso } from '@ab/money';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export interface MoneyProps {
  amount: number;
  currency: CurrencyIso;
  /** Classes for the number only (the big result numeral). */
  numberClassName?: string;
}

/** The number is an LTR island with the symbol after it (docs/07 §14.4). */
export function Money({ amount, currency, numberClassName }: MoneyProps) {
  return (
    <span className="whitespace-nowrap">
      <Ltr className={numberClassName}>{formatAmount(amount)}</Ltr> {t.pricing.currencies[currency]}
    </span>
  );
}
