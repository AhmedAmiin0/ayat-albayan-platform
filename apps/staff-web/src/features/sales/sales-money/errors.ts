import { apiErrorText } from '@/features/finance/subscriptions';
import { paymentLinkErrorText } from '@/features/sales/payment-links';
import { t } from '@/lib/i18n/i18n';

/**
 * An API failure of the sales money writes as text: the domain code (not_your_student, start_date_past,
 * attachment_type, media_expired, receipt_type…) through salesMoney.error, anything unknown is the generic «تعذّر الحفظ» line.
 */
/** «مبلغ مخصص» below the admin's cap (owner 2026-11-02): the payment link's own line. */
const TABLE = {
  ...t.salesMoney.error,
  discount_too_large: t.paymentLinks.error.discount_too_large,
};

export function salesErrorText(e: unknown): string {
  const text = apiErrorText(e, TABLE);
  return text === t.common.error ? t.salesMoney.error.generic : text;
}

/**
 * «دفع إلكتروني» of the subscribe step: the link's codes, then the step's own (teacher_not_found, start_date_*,
 * used_before_*: the link endpoint checks the same fields), anything unknown the link's generic line (as mobile).
 */
export function linkStepErrorText(e: unknown): string {
  const own = salesErrorText(e);
  return paymentLinkErrorText(e, own === t.salesMoney.error.generic ? undefined : own);
}
