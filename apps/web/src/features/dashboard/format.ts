import { clockTime, formatAmount, intlLocale, RIYADH_TZ } from '@ab/shared';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';

// Display text for the dashboard: Western digits everywhere (docs/07 §2), money rounded to whole
// units (the table and the CSV keep the exact amounts), Riyadh times with the zone said once.

const currencies: Readonly<Record<string, string>> = t.pricing.currencies;

/** «ر.س» for the site currencies, else the ISO code (EGP, …). */
export function currencyLabel(code: string): string {
  return currencies[code] ?? code;
}

/** «1,288»; negative keeps its sign. */
export function amount(n: number): string {
  const r = Math.round(n);
  return r < 0 ? `-${formatAmount(-r)}` : formatAmount(r);
}

/** «40%», or «—» when there is nothing to divide by. */
export function percent(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

const monthFormat = new Intl.DateTimeFormat(intlLocale(locale), { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "2026-09" → «سبتمبر 2026». */
export function monthLabel(month: string): string {
  return monthFormat.format(new Date(`${month}-01T00:00:00Z`));
}

const dayFormat = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'long', day: 'numeric', month: 'long', timeZone: RIYADH_TZ });

/** «الخميس، 1 أكتوبر 16:00» in Riyadh time. */
export function whenRiyadh(iso: string): string {
  const at = new Date(iso);
  return `${dayFormat.format(at)} ${clockTime(at, RIYADH_TZ)}`;
}

const dateFormat = new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'long', year: 'numeric', timeZone: RIYADH_TZ });

/** A provider rate time as a Riyadh date. */
export function rateDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}
