import { apiErrorText } from '@/features/finance/subscriptions/format';
import { t } from '@/lib/i18n/i18n';

/**
 * An API failure of the sales money writes as text: the domain code (not_your_student, start_date_past,
 * attachment_type, media_expired, receipt_type…) through salesMoney.error, anything unknown is the generic «تعذّر الحفظ» line.
 */
export function salesErrorText(e: unknown): string {
  const text = apiErrorText(e, t.salesMoney.error);
  return text === t.common.error ? t.salesMoney.error.generic : text;
}
