import {
  CUSTOM_COUNT_DEFAULT,
  CUSTOM_COUNT_MAX,
  CUSTOM_COUNT_MIN,
  DEFAULT_DURATION,
  PACKAGE_IDS,
  PRICING_DURATIONS,
  SITE_COUNTRIES,
  type SubscriptionView,
} from '@ab/shared';
import { INITIAL_PRICING, type PricingForm } from './pricing-form';

// «جدّد الاشتراك» (owner 2026-10-15): the new package starts from the student's last one, read from
// the quote it was priced from (price_source); a row without a usable quote keeps its lesson count.

export type LastPackage = Pick<SubscriptionView, 'price_source' | 'lessons_total' | 'duration'>;

const field = (o: unknown, key: string): unknown =>
  typeof o === 'object' && o !== null && key in o ? (o as Record<string, unknown>)[key] : undefined;

const among = <T>(list: readonly T[], v: unknown): T | undefined => list.find((x) => x === v);

const clampCount = (n: number): number => Math.min(CUSTOM_COUNT_MAX, Math.max(CUSTOM_COUNT_MIN, Math.round(n)));

const discountOf = (v: unknown): number => (typeof v === 'number' && v >= 0 && v <= 100 ? v : 0);

const lessonsOf = (v: unknown, fallback: number): number => (typeof v === 'number' && v > 0 ? v : fallback);

/** The calculator inputs of a renewal: the last package's tier (or count), duration, discount and country. */
export function renewalPricing(last: LastPackage | null | undefined): PricingForm {
  if (!last) return INITIAL_PRICING;
  const quote: unknown = last.price_source;
  const tier = among(PACKAGE_IDS, field(quote, 'package'));
  const duration = among(PRICING_DURATIONS, field(quote, 'duration')) ?? among(PRICING_DURATIONS, last.duration) ?? DEFAULT_DURATION;
  return {
    pkg: tier ?? 'custom',
    count: tier ? CUSTOM_COUNT_DEFAULT : clampCount(lessonsOf(field(quote, 'lessons'), last.lessons_total)),
    duration,
    discount: discountOf(field(quote, 'discount')),
    country: among(SITE_COUNTRIES, field(quote, 'country')) ?? '',
  };
}
