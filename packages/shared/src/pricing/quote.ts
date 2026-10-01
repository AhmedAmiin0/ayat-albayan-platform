// One calculator result (docs/08 §3): package or custom count → price in the guardian's currency.
import {
  basePrice,
  lessonsOf,
  TIERS,
  WEEKLY,
  type Discount,
  type PackageId,
  type PricingDuration,
  type Tier,
} from './catalog.js';
import { currencyForCountry, siteCountry, type CurrencyIso, type SiteCountry } from './currency.js';
import { customBase, priceIn, starterRateBase } from './price.js';

/** A package, or a custom lesson count (1–60), never both. */
export type QuotePackage =
  | { tier: PackageId; count?: undefined }
  | { tier?: undefined; count: number };

export type QuoteOptions = QuotePackage & {
  duration: PricingDuration;
  country?: string | null | undefined;
  students: number;
  discount: Discount;
  /** SAR→USD; required when the country is quoted in USD. */
  usdRate?: number | undefined;
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
  discount: Discount;
  /** round(total × (1 − discount%)). */
  afterDiscount: number;
  /** One student's price per lesson after the discount, 2 decimals max. */
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
    afterDiscount: Math.round(total * keep),
    perLesson: Math.round(((price * keep) / lessons) * 100) / 100,
    insteadOf,
    savingsPct: insteadOf === null ? null : Math.round((1 - price / insteadOf) * 100),
    popular: tier?.popular === true,
    featured: tier?.featured === true,
  };
}

// GET /pricing/* response shapes (apps/api pricing module), shared by the API, web and mobile.

/** The rate a USD quote used, returned with every USD price so it can be reproduced (docs/08 §4). */
export interface FxRate {
  quote: string;
  rate: number;
  /** Provider publication time (ISO); null for the peg. */
  date: string | null;
  /** "open.er-api.com", or "peg" for the 3.75 fallback. */
  provider: string;
  /** True when no rate was ever stored and the official SAR/USD peg was used. */
  fallback: boolean;
  /** Set when the API failed and an older stored rate was used: hours since the provider published it. */
  ageHours: number | null;
}

/** null for the site's own currencies. */
export type QuoteResponse = Quote & { fx: FxRate | null };

export interface CatalogResponse {
  country: SiteCountry | null;
  currency: CurrencyIso;
  duration: number;
  /** All six packages in site order, one student, no discount. */
  packages: Quote[];
  fx: FxRate | null;
}
