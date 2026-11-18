import { quoteCustom, type QuotedTotal } from '@ab/client-core';
import { useCustomPrice } from '@/features/finance/subscriptions';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/**
 * «مبلغ مخصص» on the chat's «عرض سعر» (owner 2026-11-15): the package form's field
 * (useCustomPrice) with quoteCustom's live error; any positive amount for every role (2026-11-18).
 */
export function useQuoteCustom(quote: QuotedTotal | undefined) {
  const custom = useCustomPrice({ quote, active: true });
  const state = quoteCustom(custom, t.subscriptions.customPrice.invalid);
  return { price: { ...custom, error: state.error }, total: state.total, valid: state.valid };
}
