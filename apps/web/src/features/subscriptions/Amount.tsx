import { formatAmount } from '@ab/shared';
import { Ltr } from '@/components/ui/ltr';
import { cn } from '@/lib/utils';
import { currencySymbol } from './format';

/** «145 ر.س»: the number is an LTR island, the Arabic symbol follows it (docs/07 §14.4). */
export function Amount({ amount, currency, className }: { amount: number; currency: string; className?: string }) {
  return (
    <span className="whitespace-nowrap">
      <Ltr className={cn('tabular-nums', className)}>{formatAmount(amount)}</Ltr> {currencySymbol(currency)}
    </span>
  );
}
