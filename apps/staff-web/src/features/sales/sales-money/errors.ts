import { apiErrorText } from '@/features/finance/subscriptions';
import { paymentLinkErrorText } from '@/features/sales/payment-links';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** Domain codes go through salesMoney.error; anything unknown gets the generic save-failed line. */
/** A custom amount below the admin's cap gets the payment link's own line. */
const TABLE = {
  ...t.salesMoney.error,
  discount_too_large: t.paymentLinks.error.discount_too_large,
};

export function salesErrorText(e: unknown): string {
  const text = apiErrorText(e, TABLE);
  return text === t.common.error ? t.salesMoney.error.generic : text;
}

/** The link's codes, then the step's own (same fields checked), else the link's generic line. */
export function linkStepErrorText(e: unknown): string {
  const own = salesErrorText(e);
  return paymentLinkErrorText(e, own === t.salesMoney.error.generic ? undefined : own);
}
