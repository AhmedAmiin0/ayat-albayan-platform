// Price rules of ayatalbayan.com/calculator (docs/08 §1, §3). Same arithmetic order as the site's
// bundle (rate = base / lessons; rate × n; ceil(÷ divisor)) so float results match it exactly.
import { BULK, STARTER, type PricingDuration } from './catalog.js';
import { currencyForCountry } from './currency.js';

/** Site lE, before the currency step: n lessons at bulk's per-lesson rate from 28 up, else starter's. */
export function customBase(count: number, duration: PricingDuration): number {
  const tier = count >= BULK.lessons ? BULK : STARTER;
  const rate = tier.base[duration] / tier.lessons;
  return rate * count;
}

/** Site aE, before the currency step: `lessons` at the starter per-lesson rate («بدلاً من»). */
export function starterRateBase(lessons: number, duration: PricingDuration): number {
  const rate = STARTER.base[duration] / STARTER.lessons;
  return rate * lessons;
}

export interface PriceInOptions {
  /** SAR amount, possibly fractional (custom counts). */
  base: number;
  country: string | null | undefined;
  /** SAR→USD rate; required only when the country is quoted in USD. */
  usdRate?: number | undefined;
}

/**
 * Whole-unit price in the country's currency: site countries `ceil(base / divisor)`; anyone else
 * USD `ceil(base × rate)`. The USD product is rounded to cents first: API rates carry 6 decimals
 * (0.266667 for the 3.75 peg), and 120 × 0.266667 = 32.00004 must quote $32, not $33.
 */
export function priceIn({ base, country, usdRate }: PriceInOptions): number {
  const { divisor } = currencyForCountry(country);
  if (divisor !== null) return Math.ceil(base / divisor);
  if (usdRate === undefined || !(usdRate > 0)) throw new Error('usdRate required for a USD price');
  return Math.ceil(Math.round(base * usdRate * 100) / 100);
}

/**
 * 2 decimals, half-up on the shortest decimal form: what the site's
 * `Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })` shows. 9.825 → 9.83 and
 * 10.924999999999999 → 10.92, where Math.round(x × 100) / 100 gives 9.82 and 10.93. No Intl
 * (Hermes). Non-negative input; below 0.001 is 0 (String() turns exponential under 1e-6).
 */
export function roundCents(x: number): number {
  if (x < 0.001) return 0;
  const [int = '0', frac = ''] = String(x).split('.');
  const cents = Number(int + (frac + '00').slice(0, 2));
  return (cents + (Number(frac[2] ?? '0') >= 5 ? 1 : 0)) / 100;
}
