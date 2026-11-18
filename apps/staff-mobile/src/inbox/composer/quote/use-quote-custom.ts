import { quoteCustom, type QuotedTotal } from '@ab/client-core';
import { t } from '@ab/mobile-kit';
import { useCustomPrice } from '@/subscribe';

/**
 * «مبلغ مخصص» on the chat's «عرض سعر» (owner 2026-11-15): the package form's field
 * (useCustomPrice) with quoteCustom's error; any positive amount for every role (2026-11-18).
 */
export function useQuoteCustom(quote: QuotedTotal | undefined) {
  const custom = useCustomPrice(quote);
  const state = quoteCustom(custom, t.subscriptions.customPrice.invalid);
  return {
    price: { ...custom, error: state.error ?? undefined },
    total: state.total,
    valid: state.valid,
  };
}
