import type { PaymentLinkView } from '@ab/shared';
import { formatAmount } from '@ab/money';
import { currencySymbol } from '@/features/finance/subscriptions';
import { t } from '@ab/web-kit';

/** A paymentLinks string with its `{name}` slots filled. */
export function fillText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, name: string) => (name in values ? String(values[name]) : slot));
}

export const moneySlots = (amount: number, currency: string) => ({ amount: formatAmount(amount), currency: currencySymbol(currency) });

/** The text she sends herself, with the link's url on its own line. */
export function linkMessage(link: Pick<PaymentLinkView, 'student' | 'lessons' | 'amount' | 'currency' | 'url'>): string {
  return fillText(t.paymentLinks.message, { student: link.student.name, lessons: link.lessons, ...moneySlots(link.amount, link.currency), url: link.url });
}
