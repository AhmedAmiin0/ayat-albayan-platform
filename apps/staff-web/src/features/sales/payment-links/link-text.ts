import { formatAmount, type PaymentLinkView } from '@ab/shared';
import { currencySymbol } from '@/features/finance/subscriptions';
import { t } from '@/lib/i18n/i18n';

/** A paymentLinks string with its `{name}` slots filled. */
export function fillText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, name: string) => (name in values ? String(values[name]) : slot));
}

/** The `{amount} {currency}` pair of a paymentLinks string: «290» and «ر.س». */
export const moneySlots = (amount: number, currency: string) => ({ amount: formatAmount(amount), currency: currencySymbol(currency) });

/** «إرسال في المحادثة»: the text she sends herself, the link's url on its own line. */
export function linkMessage(link: Pick<PaymentLinkView, 'student' | 'lessons' | 'amount' | 'currency' | 'url'>): string {
  return fillText(t.paymentLinks.message, { student: link.student.name, lessons: link.lessons, ...moneySlots(link.amount, link.currency), url: link.url });
}
