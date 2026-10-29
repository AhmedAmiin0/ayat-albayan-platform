import { apiErrorText } from '@/features/finance/subscriptions';
import { t } from '@/lib/i18n/i18n';

/** A payment-link failure as text: its code through paymentLinks.error, anything unknown `fallback` (the generic line). */
export function paymentLinkErrorText(e: unknown, fallback: string = t.paymentLinks.error.generic): string {
  const text = apiErrorText(e, t.paymentLinks.error);
  return text === t.common.error ? fallback : text;
}
