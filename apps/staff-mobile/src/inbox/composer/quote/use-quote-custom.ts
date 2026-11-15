import { quoteCustom, type QuotedTotal } from '@ab/client-core';
import { currencyName, t, usePermissions } from '@ab/mobile-kit';
import { useCustomPrice } from '@/subscribe';

const LABELS = { ...t.subscriptions.customPrice, currency: currencyName };

/**
 * «مبلغ مخصص» on the chat's «عرض سعر» (owner 2026-11-15): the package form's field
 * (useCustomPrice) with quoteCustom's floor and error; subscriptions.write has no floor.
 */
export function useQuoteCustom(quote: QuotedTotal | undefined) {
  const can = usePermissions();
  const custom = useCustomPrice(quote);
  const admin = can('subscriptions.write');
  const state = quoteCustom({ quote, typed: custom, admin, labels: LABELS });
  return {
    price: { ...custom, error: state.error ?? undefined },
    total: state.total,
    valid: state.valid,
  };
}
