import type { SubscriptionPricing } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useDebounced } from '@/features/finance/pricing';
import { useCustomPrice } from '@/features/finance/subscriptions';
import { quoteSalesSubscription, SALES_MONEY_KEY, type Bind } from '@/features/sales/sales-money/api';

interface Opts {
  /** '' = no quote asked (no student yet, or «دفع إلكتروني», which has its own). */
  studentId: string;
  /** One object per form (usePricingBody): the debounce settles on it. */
  pricing: SubscriptionPricing;
  bind?: Bind | undefined;
}

/** POST /sales/subscriptions/quote (debounced): one query per student and inputs, shared. */
export function useSalesQuote({ studentId, pricing, bind }: Opts) {
  const settled = useDebounced(pricing, 300);
  return useQuery({
    queryKey: [...SALES_MONEY_KEY, 'quote', studentId, settled],
    queryFn: () => quoteSalesSubscription({ studentId, pricing: settled, ...bind }),
    enabled: studentId !== '',
  });
}

/** «مبلغ مخصص» on the bank-transfer package price, starting from the sales quote. */
export function useSalesCustomPrice(opts: Opts) {
  const quote = useSalesQuote(opts).data;
  return useCustomPrice({ quote, active: opts.studentId !== '' });
}
