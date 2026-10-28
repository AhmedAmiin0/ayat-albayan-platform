import { apiErrorText } from '@/features/finance/subscriptions';
import { t } from '@/lib/i18n/i18n';

/** A payment-link failure as text: its code through paymentLinks.error, anything unknown the generic line. */
export function paymentLinkErrorText(e: unknown): string {
  const text = apiErrorText(e, t.paymentLinks.error);
  return text === t.common.error ? t.paymentLinks.error.generic : text;
}
