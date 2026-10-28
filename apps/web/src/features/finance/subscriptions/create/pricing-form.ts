import {
  CUSTOM_COUNT_DEFAULT,
  CUSTOM_COUNT_MAX,
  CUSTOM_COUNT_MIN,
  DEFAULT_DURATION,
  lessonsOf,
  type PackageId,
  type PricingDuration,
  type SiteCountry,
  type SubscriptionPricing,
} from '@ab/shared';

// The create dialog's calculator inputs (R-SUB-01). Only inputs: the price comes from the API.

export interface PricingForm {
  pkg: PackageId | 'custom';
  count: number;
  duration: PricingDuration;
  discount: number;
  /** '' = the guardian's country (the API's default). */
  country: SiteCountry | '';
}

export const INITIAL_PRICING: PricingForm = {
  pkg: 'standard',
  count: CUSTOM_COUNT_DEFAULT,
  duration: DEFAULT_DURATION,
  discount: 0,
  country: '',
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n) || min));

/** The `pricing` body of POST /subscriptions(/quote): exactly one of tier / count. */
export function pricingBody(f: PricingForm): SubscriptionPricing {
  const common = {
    duration: f.duration,
    discount: Math.min(100, Math.max(0, f.discount || 0)),
    ...(f.country ? { country: f.country } : {}),
  };
  return f.pkg === 'custom'
    ? { ...common, count: clamp(f.count, CUSTOM_COUNT_MIN, CUSTOM_COUNT_MAX) }
    : { ...common, tier: f.pkg };
}

/** The package's lessons from the calculator inputs (no quote needed): the tier's, or the custom count. */
export function pricingLessons(p: SubscriptionPricing): number {
  return 'count' in p ? p.count : lessonsOf(p.tier);
}

/** Today as a local YYYY-MM-DD in `tz` (the package's first day, in the student's tz). */
export function todayIn(tz: string, now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: tz });
}
