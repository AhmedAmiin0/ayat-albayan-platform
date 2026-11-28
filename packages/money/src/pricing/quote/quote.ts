// One calculator result (docs/08 §3): package or custom count → price in the guardian's currency.
import {
  basePrice,
  lessonsOf,
  TIERS,
  WEEKLY,
  type PackageId,
  type PricingDuration,
  type Tier,
} from '../catalog';
import { currencyForCountry, siteCountry, type CurrencyIso, type SiteCountry } from '../currency';
import { customBase, priceIn, roundCents, starterRateBase } from '../price';
import { roundPrice } from './rounding';
import type { Rounding } from './rounding.schemas';

/** A package, or a custom lesson count (1–60), never both. */
export type QuotePackage =
  | { tier: PackageId; count?: undefined }
  | { tier?: undefined; count: number };

export type QuoteOptions = QuotePackage & {
  duration: PricingDuration;
  country?: string | null | undefined;
  students: number;
  /** Percent, 0–100 (the site's pills or its free field). */
  discount: number;
  /** SAR→USD; required when the country is quoted in USD. */
  usdRate?: number | undefined;
  /** How afterDiscount reaches a whole unit; absent is nearest, the price a package is sold at. */
  rounding?: Rounding | undefined;
};

export interface Quote {
  package: PackageId | 'custom';
  lessons: number;
  /** Minutes per lesson: the requested one, or 90 for weekly. */
  duration: number;
  /** One of the site's countries, or null (quoted in USD). */
  country: SiteCountry | null;
  currency: CurrencyIso;
  /** Package price for one student. */
  price: number;
  students: number;
  /** price × students. */
  total: number;
  discount: number;
  /** total × (1 − discount%) as a whole unit: nearest, unless the quote asked for up or down. */
  afterDiscount: number;
  /** One student's price per lesson after the discount, 2 decimals max (rounded like the site). */
  perLesson: number;
  /** Featured (bulk) tier only: the same lessons at the starter rate, and the saving vs it. */
  insteadOf: number | null;
  savingsPct: number | null;
  popular: boolean;
  featured: boolean;
}

function packageOf(o: QuoteOptions): { id: Quote['package']; lessons: number; base: number } {
  if (o.tier !== undefined)
    return { id: o.tier, lessons: lessonsOf(o.tier), base: basePrice(o.tier, o.duration) };
  return { id: 'custom', lessons: o.count, base: customBase(o.count, o.duration) };
}

export function quote(o: QuoteOptions): Quote {
  const { id, lessons, base } = packageOf(o);
  const at = { country: o.country, usdRate: o.usdRate };
  const price = priceIn({ base, ...at });
  const total = price * o.students;
  const keep = 1 - o.discount / 100;
  const tier: Tier | undefined = TIERS.find((t) => t.id === id);
  const insteadOf = tier?.featured
    ? priceIn({ base: starterRateBase(lessons, o.duration), ...at })
    : null;
  return {
    package: id,
    lessons,
    duration: id === WEEKLY.id ? WEEKLY.duration : o.duration,
    country: siteCountry(o.country),
    currency: currencyForCountry(o.country).iso,
    price,
    students: o.students,
    total,
    discount: o.discount,
    afterDiscount: roundPrice(total * keep, o.rounding),
    perLesson: roundCents((price * keep) / lessons),
    insteadOf,
    savingsPct: insteadOf === null ? null : Math.round((1 - price / insteadOf) * 100),
    popular: tier?.popular === true,
    featured: tier?.featured === true,
  };
}
