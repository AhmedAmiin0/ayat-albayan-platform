import type { PublicPaymentLink } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

/** «صفحة دفع تجريبية»: only while the API's Stripe key is a sandbox one (`sandbox`, docs/30 §4). */
export function PayTestNotice({ link }: { link: PublicPaymentLink | undefined }) {
  if (link?.sandbox !== true) return null;
  const text = t.paymentLinks.pay.testNotice;
  return <p className="rounded-md bg-gold-wash px-3 py-2 text-xs text-ink">{text}</p>;
}
