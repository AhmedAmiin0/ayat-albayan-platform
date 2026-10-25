import { formatAmount, type CurrencyIso } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n/i18n';

export interface MoneyProps {
  amount: number;
  currency: CurrencyIso;
  /** Classes for the number only (the big result numeral). */
  numberClassName?: string;
}

/** «1,061 ر.س»: the number is an LTR island, the Arabic symbol follows it (docs/07 §14.4). */
export function Money({ amount, currency, numberClassName }: MoneyProps) {
  return (
    <span className="whitespace-nowrap">
      <Ltr className={numberClassName}>{formatAmount(amount)}</Ltr> {t.pricing.currencies[currency]}
    </span>
  );
}
