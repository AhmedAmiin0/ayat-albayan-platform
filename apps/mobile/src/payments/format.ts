import { counted, formatAmount, intlLocale, RIYADH_TZ, type SubscriptionView } from '@ab/shared';
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
const riyadhDay = dayIn(RIYADH_TZ);
const calendarDay = dayIn('UTC');

/** «1 أكتوبر 2026»: the Riyadh day of an instant (the app's clock, docs/07 §12). */
export function instantDay(iso: string): string {
  return riyadhDay.format(new Date(iso));
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
