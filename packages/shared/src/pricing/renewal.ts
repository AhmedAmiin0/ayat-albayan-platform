import type { SubscriptionView } from '../money/views.js';
import {
  CUSTOM_COUNT_DEFAULT,
  CUSTOM_COUNT_MAX,
  CUSTOM_COUNT_MIN,
  DEFAULT_DURATION,
  PACKAGE_IDS,
  PRICING_DURATIONS,
  type PackageId,
  type PricingDuration,
} from './catalog.js';
import { SITE_COUNTRIES, type SiteCountry } from './currency.js';

// «جدّد الاشتراك» (owner 2026-10-15, docs/18): the new package starts from the student's last one,
// read from the quote it was priced from (price_source); a row without a usable quote keeps its
// lesson count. Shared by the web dialog and the mobile subscribe screen. Pure.

export type LastPackage = Pick<SubscriptionView, 'price_source' | 'lessons_total' | 'duration'>;

/** The calculator inputs of a renewal. `country` '' = the guardian's country (the API's default). */
export interface RenewalPricing {
  pkg: PackageId | 'custom';
  count: number;
  duration: PricingDuration;
  discount: number;
  country: SiteCountry | '';
}

/** Without a last package: the calculator's defaults. */
export const DEFAULT_RENEWAL_PRICING: RenewalPricing = {
  pkg: 'standard',
  count: CUSTOM_COUNT_DEFAULT,
  duration: DEFAULT_DURATION,
  discount: 0,
  country: '',
};

const field = (o: unknown, key: string): unknown =>
  typeof o === 'object' && o !== null && key in o ? (o as Record<string, unknown>)[key] : undefined;

const among = <T>(list: readonly T[], v: unknown): T | undefined => list.find((x) => x === v);

const clampCount = (n: number): number => Math.min(CUSTOM_COUNT_MAX, Math.max(CUSTOM_COUNT_MIN, Math.round(n)));

const discountOf = (v: unknown): number => (typeof v === 'number' && v >= 0 && v <= 100 ? v : 0);

const lessonsOf = (v: unknown, fallback: number): number => (typeof v === 'number' && v > 0 ? v : fallback);

/** The last package's tier (or count), duration, discount and country. */
export function renewalPricing(last: LastPackage | null | undefined): RenewalPricing {
  if (!last) return DEFAULT_RENEWAL_PRICING;
  const quote: unknown = last.price_source;
  const tier = among(PACKAGE_IDS, field(quote, 'package'));
  const duration =
    among(PRICING_DURATIONS, field(quote, 'duration')) ?? among(PRICING_DURATIONS, last.duration) ?? DEFAULT_DURATION;
  return {
    pkg: tier ?? 'custom',
    count: tier ? CUSTOM_COUNT_DEFAULT : clampCount(lessonsOf(field(quote, 'lessons'), last.lessons_total)),
    duration,
    discount: discountOf(field(quote, 'discount')),
    country: among(SITE_COUNTRIES, field(quote, 'country')) ?? '',
  };
}
