import type { SubscriptionPricing } from '@ab/money';
import { useQuery } from '@tanstack/react-query';
import { useDebounced } from '@/features/finance/pricing';
import { useCustomPrice } from '@/features/finance/subscriptions';
import { quoteSalesSubscription, type Bind } from '@/features/sales/sales-money/api';
import { salesMoneyKeys } from '@/features/sales/keys';

interface Opts {
  /** Empty means no quote asked (no student yet, or online payment, which has its own). */
  studentId: string;
  /** One object per form (usePricingBody): the debounce settles on it. */
  pricing: SubscriptionPricing;
  bind?: Bind | undefined;
}

/** POST /sales/subscriptions/quote (debounced): one query per student and inputs, shared. */
export function useSalesQuote({ studentId, pricing, bind }: Opts) {
  const settled = useDebounced(pricing, 300);
  return useQuery({
    queryKey: salesMoneyKeys.quote(studentId, settled),
    queryFn: () => quoteSalesSubscription({ studentId, pricing: settled, ...bind }),
    enabled: studentId !== '',
  });
}

export function useSalesCustomPrice(opts: Opts) {
  const quote = useSalesQuote(opts).data;
  return useCustomPrice({ quote, active: opts.studentId !== '' });
}
