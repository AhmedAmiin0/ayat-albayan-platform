import type { SubscriptionPricing } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useDebounced } from '@/features/finance/pricing';
import { MONEY_KEY, quoteSubscription } from '@/features/finance/subscriptions/api';
import { pricingBody, type PricingForm } from './pricing-form';

/**
 * pricingBody(form), one object per form: a debounce (useDebounced) settles on this very object,
 * so the form's own renders (typing a note, a price) never restart the quote.
 */
export function usePricingBody(form: PricingForm): SubscriptionPricing {
  const [held, setHeld] = useState(() => ({ form, pricing: pricingBody(form) }));
  if (held.form !== form) setHeld({ form, pricing: pricingBody(form) });
  return held.form === form ? held.pricing : pricingBody(form);
}

/**
 * POST /subscriptions/quote (debounced): the price the package will be stored with. One query per
 * student and inputs, shared by the preview and «مبلغ مخصص»; none while no student is picked.
 */
export function useSubscriptionQuote(studentId: string, pricing: SubscriptionPricing) {
  const settled = useDebounced(pricing, 300);
  return useQuery({
    queryKey: [...MONEY_KEY, 'quote', studentId, settled],
    queryFn: () => quoteSubscription({ studentId, pricing: settled }),
    enabled: studentId !== '',
  });
}
