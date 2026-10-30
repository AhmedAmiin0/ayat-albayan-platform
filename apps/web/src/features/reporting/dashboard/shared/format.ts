import { clockOf, formatAmount, intlLocale } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import type { Clock } from '@/lib/clock';

// Display text for the dashboard: Western digits everywhere (docs/07 §2), money rounded to whole
// units (the table and the CSV keep the exact amounts), times in the viewer's zone (docs/34).

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

const dayFormat = (timeZone: string) =>
  new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'long', day: 'numeric', month: 'long', timeZone });

/** «الخميس، 1 أكتوبر 16:00» in `clock.tz`, the viewer's zone (useViewerTz()). */
export function whenViewer(iso: string, clock: Clock & { tz: string }): string {
  const at = new Date(iso);
  return `${dayFormat(clock.tz).format(at)} ${clockOf(at, clock)}`;
}

/** A provider rate time as a date in `tz`, the viewer's zone (useViewerTz()). */
export function rateDate(iso: string, tz: string): string {
  const opts = { day: 'numeric', month: 'long', year: 'numeric', timeZone: tz } as const;
  return new Intl.DateTimeFormat(intlLocale(locale), opts).format(new Date(iso));
}
