import {
  CUSTOM_COUNT_DEFAULT,
  DEFAULT_DURATION,
  DEFAULT_ROUNDING,
  parseDiscount,
  STUDENTS_MIN,
  type PackageId,
  type PricingDuration,
  type Rounding,
  type SiteCountry,
} from '@ab/money';
import type { ListParams } from '@ab/mobile-kit';
import type { QuoteQueryInput } from '@ab/shared';

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

/**
 * Nearest is what the API does when `rounding` is left out, so it is never sent: the calculator's
 * request, and every quote already cached, stay as they were.
 */
const sentRounding = (rounding: Rounding): Rounding | undefined =>
  rounding === DEFAULT_ROUNDING ? undefined : rounding;

/** Query params for /pricing/quote: `tier` xor `count`, and no `country` at all for USD. */
export function quoteParams(
  s: Selection,
  rounding: Rounding = DEFAULT_ROUNDING,
): ListParams & QuoteQueryInput {
  const pick =
    s.plan === 'custom' ? { tier: undefined, count: s.count } : { tier: s.plan, count: undefined };
  return {
    ...pick,
    duration: s.duration,
    country: s.country === 'other' ? undefined : s.country,
    students: s.students,
    discount: parseDiscount(s.discount),
    rounding: sentRounding(rounding),
  };
}
