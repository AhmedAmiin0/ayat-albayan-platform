import { viewerTz } from '@ab/client-core';
import { clockOf, dateText, formatAmount } from '@ab/shared';
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

/** "2026-09" → «سبتمبر 2026». */
export function monthLabel(month: string): string {
  const first = new Date(`${month}-01T00:00:00Z`);
  return dateText(first, { tz: 'UTC', locale }, { month: 'long', year: 'numeric' });
}

const WEEKDAY_DAY_MONTH = { weekday: 'long', day: 'numeric', month: 'long' } as const;

/** «الخميس، 1 أكتوبر 16:00» in the viewer's zone. */
export function whenViewer(iso: string, clock: Clock): string {
  const at = new Date(iso);
  const tz = viewerTz();
  return `${dateText(at, { tz, locale }, WEEKDAY_DAY_MONTH)} ${clockOf(at, { tz, ...clock })}`;
}

/** A provider rate time as a date in the viewer's zone. */
export function rateDate(iso: string): string {
  const fields = { day: 'numeric', month: 'long', year: 'numeric' } as const;
  return dateText(new Date(iso), { tz: viewerTz(), locale }, fields);
}
