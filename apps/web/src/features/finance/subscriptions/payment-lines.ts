import { formatAmount, partPaid, receiptShortfall } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { currencySymbol } from './format';

// The part-paid wording (owner 2026-10-28, «Why is this unpaid»): a package stays 'unpaid' until the
// net paid reaches its price; these lines say how far it is. Western digits, the currency's symbol.

/** «مدفوعة جزئيًا: 80 من 81 ر.س · الباقي 1» while 0 < paid < price (partPaid), else null. */
export function partPaidText(s: { paid: number; price: number; currency: string }): string | null {
  const part = partPaid(s);
  if (!part) return null;
  return t.packagePayment.partPaid
    .replace('{paid}', formatAmount(part.paid))
    .replace('{price}', formatAmount(part.price))
    .replace('{currency}', currencySymbol(s.currency))
    .replace('{due}', formatAmount(part.due));
}

/** «المبلغ أقل من المستحق بـ 1 ر.س…» before saving a receipt short of what is due, else null (never blocks). */
export function shortfallText(input: { amount: number; due: number; currency: string }): string | null {
  const short = receiptShortfall(input);
  if (short <= 0) return null;
  return t.packagePayment.shortfall.replace('{amount}', formatAmount(short)).replace('{currency}', currencySymbol(input.currency));
}
