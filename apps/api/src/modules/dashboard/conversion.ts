import type { FxRate } from '@ab/shared';

// Money in many currencies → settings.reporting_currency (R-RPT-02, docs/11 §9 FX).
// FxService gives SAR→X rates (X per 1 SAR), so 1 reporting unit = rate(SAR→X) / rate(SAR→R) X.

export interface Conversion {
  /** The reporting currency. */
  currency: string;
  /** Units of each currency per 1 reporting unit; the reporting currency itself is 1. */
  rates: Record<string, number>;
  /** Currencies with no stored rate: their amounts are left out. */
  missing: string[];
  /** Oldest provider date among the rates used; null when nothing needed converting. */
  date: string | null;
}

export interface ConversionInput {
  reporting: string;
  /** SAR→reporting; null = no rate (then every other currency is missing). */
  base: FxRate | null;
  /** SAR→currency for every other currency met in the data; null = no rate. */
  quotes: readonly (readonly [string, FxRate | null])[];
}

export function conversionFrom({ reporting, base, quotes }: ConversionInput): Conversion {
  const rates: Record<string, number> = { [reporting]: 1 };
  const missing: string[] = [];
  const dates: string[] = [];
  for (const [currency, quote] of quotes) {
    if (currency === reporting) continue;
    if (!quote || !base) {
      missing.push(currency);
      continue;
    }
    rates[currency] = quote.rate / base.rate;
    for (const d of [quote.date, base.date]) if (d) dates.push(d);
  }
  dates.sort();
  return { currency: reporting, rates, missing: missing.sort(), date: dates[0] ?? null };
}

/** `amount` of `currency` in the reporting currency; null when that currency has no rate. */
export function convert(c: Conversion, amount: number, currency: string): number | null {
  const rate = c.rates[currency];
  return rate === undefined ? null : amount / rate;
}

/** Money is shown to 2 decimals. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
