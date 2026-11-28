import { z } from 'zod';
import type { SubscriptionView } from '../ledger';
import {
  CUSTOM_COUNT_DEFAULT,
  CUSTOM_COUNT_MAX,
  CUSTOM_COUNT_MIN,
  DEFAULT_DURATION,
  PACKAGE_IDS,
  PRICING_DURATIONS,
  type PackageId,
  type PricingDuration,
} from './catalog';
import { SITE_COUNTRIES, type SiteCountry } from './currency';

// Renewal (docs/18) starts from the last package's quote; else it keeps the lesson count.

export type LastPackage = Pick<SubscriptionView, 'price_source' | 'lessons_total' | 'duration'>;

/**
 * The calculator inputs of a renewal. `country` '' = the guardian's country (the API's default).
 */
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

/** Each field of the last quote that is usable, else its fallback: a bad one never blocks. */
const lastQuoteSchema = z
  .object({
    package: z.enum(PACKAGE_IDS).optional().catch(undefined),
    duration: z.literal(PRICING_DURATIONS).optional().catch(undefined),
    lessons: z.number().positive().optional().catch(undefined),
    discount: z.number().min(0).max(100).catch(0),
    country: z.enum(SITE_COUNTRIES).or(z.literal('')).catch(''),
  })
  .catch({ discount: 0, country: '' });

const among = <T>(list: readonly T[], v: unknown): T | undefined => list.find((x) => x === v);

const clampCount = (n: number): number =>
  Math.min(CUSTOM_COUNT_MAX, Math.max(CUSTOM_COUNT_MIN, Math.round(n)));

const durationOf = (quoted: PricingDuration | undefined, last: LastPackage): PricingDuration =>
  quoted ?? among(PRICING_DURATIONS, last.duration) ?? DEFAULT_DURATION;

/** The last package's tier (or count), duration, discount and country. */
export function renewalPricing(last: LastPackage | null | undefined): RenewalPricing {
  if (!last) return DEFAULT_RENEWAL_PRICING;
  const quote = lastQuoteSchema.parse(last.price_source);
  const tier = quote.package;
  const lessons = quote.lessons ?? last.lessons_total;
  return {
    pkg: tier ?? 'custom',
    count: tier ? CUSTOM_COUNT_DEFAULT : clampCount(lessons),
    duration: durationOf(quote.duration, last),
    discount: quote.discount,
    country: quote.country,
  };
}
