import { quoteCustom, type QuotedTotal } from '@ab/client-core';
import { t } from '@ab/mobile-kit';
import { useCustomPrice } from '@/subscribe';

/** Any positive custom amount is allowed for every role. */
export function useQuoteCustom(quote: QuotedTotal | undefined) {
  const custom = useCustomPrice(quote);
  const state = quoteCustom(custom, t.subscriptions.customPrice.invalid);
  return {
    price: { ...custom, error: state.error ?? undefined },
    total: state.total,
    valid: state.valid,
  };
}
