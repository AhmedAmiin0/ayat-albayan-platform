import { counted, formatAmount, intlLocale, partPaid, receiptShortfall, type SubscriptionView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { ltr } from '@/core/ui/primitives/Ltr';

// Money lines (docs/07 §2: Western digits, LTR values isolated). Strings come from ar.json only.

const currencyNames: Record<string, string | undefined> = t.pricing.currencies;

/** «ر.س» for the site currencies, else the isolated ISO code («EGP»). */
export function currencyName(currency: string): string {
  return currencyNames[currency] ?? ltr(currency);
}

/** «145 ر.س»: the isolated amount, then the currency. */
export function money(amount: number, currency: string): string {
  return `${ltr(formatAmount(amount))} ${currencyName(currency)}`;
}

/** «8 حلقات في الشهر», or «10 حلقات» for a custom count (package null). */
export function packageName(sub: Pick<SubscriptionView, 'package' | 'lessons_total'>): string {
  return sub.package ? t.enums.packageSize[sub.package] : counted(t.today.count, sub.lessons_total);
}

const dayIn = (timeZone: string) =>
  new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'long', year: 'numeric', timeZone });
const days = new Map<string, Intl.DateTimeFormat>();
const calendarDay = dayIn('UTC');

/** «1 أكتوبر 2026»: the day of an instant in the viewer's `tz` (docs/34; useViewerTz). */
export function instantDay(iso: string, tz: string): string {
  const format = days.get(tz) ?? dayIn(tz);
  days.set(tz, format);
  return format.format(new Date(iso));
}

/** «1 أكتوبر 2026» for a local date (YYYY-MM-DD, e.g. starts_on), whatever the phone's zone. */
export function localDay(date: string): string {
  return calendarDay.format(new Date(`${date}T12:00:00Z`));
}

/** «8 حلقات في الشهر · من 24 سبتمبر 2026»: tells two packages of one student apart. */
export function packageFrom(sub: SubscriptionView): string {
  return t.payments.mobile.packageFrom
    .replace('{package}', packageName(sub))
    .replace('{date}', localDay(sub.starts_on));
}

/** «اتدفع 72.5 من 145 ر.س». */
export function paidOf(sub: Pick<SubscriptionView, 'paid' | 'price' | 'currency'>): string {
  return t.payments.paidOf
    .replace('{paid}', ltr(formatAmount(sub.paid)))
    .replace('{price}', money(sub.price, sub.currency));
}

/** «2 من 4 حلقة»: this package's own count (FIFO, docs/11 §2). */
export function usedOf(sub: SubscriptionView): string {
  return t.subscriptions.usedOf
    .replace('{used}', String(sub.balance.lessons_used))
    .replace('{total}', String(sub.lessons_total));
}

const amount = (n: number) => ltr(formatAmount(n));

/**
 * «مدفوعة جزئيًا: 80 من 81 ر.س · الباقي 1» while 0 < paid < price (owner 2026-10-28: why a package of
 * 81 with 80 received is still «غير مدفوعة»), else null. The rule stays: only net paid ≥ price is paid.
 */
export function partPaidLine(sub: { paid: number; price: number; currency: string }): string | null {
  const part = partPaid(sub);
  if (!part) return null;
  return t.packagePayment.partPaid
    .replace('{paid}', amount(part.paid))
    .replace('{price}', amount(part.price))
    .replace('{currency}', currencyName(sub.currency))
    .replace('{due}', amount(part.due));
}

/** The part-paid line, else «دُفع 72.5 من 145 ر.س». */
export const paidLine = (sub: Pick<SubscriptionView, 'paid' | 'price' | 'currency'>): string => partPaidLine(sub) ?? paidOf(sub);

/** Before saving a receipt smaller than what is still due: «المبلغ أقل من المستحق بـ 1 ر.س، …», else null. */
export function shortfallLine(input: { amount: number | null; due: number; currency: string }): string | null {
  const short = input.amount === null ? 0 : receiptShortfall({ amount: input.amount, due: input.due });
  if (short <= 0) return null;
  return t.packagePayment.shortfall.replace('{amount}', amount(short)).replace('{currency}', currencyName(input.currency));
}
