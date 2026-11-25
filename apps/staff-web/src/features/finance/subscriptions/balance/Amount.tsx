import { formatAmount } from '@ab/money';
import { Ltr, cn } from '@ab/web-kit';
import { currencySymbol } from '@/features/finance/subscriptions/format';

/** The number is an LTR island with the symbol after it (docs/07 §14.4). */
export function Amount({ amount, currency, className }: { amount: number; currency: string; className?: string }) {
  return (
    <span className="whitespace-nowrap">
      <Ltr className={cn('tabular-nums', className)}>{formatAmount(amount)}</Ltr> {currencySymbol(currency)}
    </span>
  );
}
