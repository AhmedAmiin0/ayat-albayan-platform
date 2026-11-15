import { quoteCustom, type QuotedTotal } from '@ab/client-core';
import { currencySymbol, useCustomPrice } from '@/features/finance/subscriptions';
import { usePermissions } from '@/features/people/auth';
import { t } from '@/lib/i18n/i18n';

const LABELS = { ...t.subscriptions.customPrice, currency: currencySymbol };

/**
 * «مبلغ مخصص» on the chat's «عرض سعر» (owner 2026-11-15): the package form's field
 * (useCustomPrice) with quoteCustom's floor and live error; subscriptions.write has no floor.
 */
export function useQuoteCustom(quote: QuotedTotal | undefined) {
  const { can } = usePermissions();
  const custom = useCustomPrice({ quote, active: true });
  const admin = can('subscriptions.write');
  const state = quoteCustom({ quote, typed: custom, admin, labels: LABELS });
  return { price: { ...custom, error: state.error }, total: state.total, valid: state.valid };
}
