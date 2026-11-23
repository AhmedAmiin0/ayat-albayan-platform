import {
  CUSTOM_COUNT_DEFAULT,
  DEFAULT_DURATION,
  parseDiscount,
  STUDENTS_MIN,
  type PackageId,
  type PricingDuration,
  type SiteCountry,
} from '@ab/shared';
import type { ListParams } from '@ab/mobile-kit';

// The API prices the choice (GET /pricing/quote); pill values are strings, hence `${}`.

/** The other-country choice omits the country and the API quotes in USD. */
export type CountryChoice = SiteCountry | 'other';
export type PlanChoice = PackageId | 'custom';

export interface Selection {
  country: CountryChoice;
  duration: `${PricingDuration}`;
  plan: PlanChoice;
  /** Lessons for 'custom' only. */
  count: number;
  students: number;
  /** Raw pill value or typed text, possibly with Arabic digits; parsed when sent. */
  discount: string;
}

export const DEFAULT_SELECTION: Selection = {
  country: 'SA',
  duration: `${DEFAULT_DURATION}`,
  plan: 'standard',
  count: CUSTOM_COUNT_DEFAULT,
  students: STUDENTS_MIN,
  discount: '0',
};

/** Query params for /pricing/quote: `tier` xor `count`, and no `country` at all for USD. */
export function quoteParams(s: Selection): ListParams {
  const custom = s.plan === 'custom';
  return {
    tier: custom ? undefined : s.plan,
    count: custom ? s.count : undefined,
    duration: s.duration,
    country: s.country === 'other' ? undefined : s.country,
    students: s.students,
    discount: parseDiscount(s.discount),
  };
}
