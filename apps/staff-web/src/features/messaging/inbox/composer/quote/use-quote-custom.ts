import { quoteCustom, type QuotedTotal } from '@ab/client-core';
import { useCustomPrice } from '@/features/finance/subscriptions';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** Any positive custom amount is allowed for every role. */
export function useQuoteCustom(quote: QuotedTotal | undefined) {
  const custom = useCustomPrice({ quote, active: true });
  const state = quoteCustom(custom, t.subscriptions.customPrice.invalid);
  return { price: { ...custom, error: state.error }, total: state.total, valid: state.valid };
}
