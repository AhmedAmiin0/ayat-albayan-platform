import {
  DEFAULT_DURATION,
  STARTER,
  STUDENTS_MIN,
  type Discount,
  type PackageId,
  type PricingDuration,
  type SiteCountry,
} from '@ab/shared';
import type { ListParams } from '@/lib/query-keys';

// What the staff member picked on «حاسبة الأسعار». The API prices it (GET /pricing/quote); the
// app only turns the choice into query params. Pill values are strings (FilterPills), hence `${}`.

/** «دولة تانية (بالدولار)»: the country is left out and the API quotes in USD. */
export type CountryChoice = SiteCountry | 'other';
export type PlanChoice = PackageId | 'custom';

export interface Selection {
  country: CountryChoice;
  duration: `${PricingDuration}`;
  plan: PlanChoice;
  /** Lessons for 'custom' only. */
  count: number;
  students: number;
  discount: `${Discount}`;
}

export const DEFAULT_SELECTION: Selection = {
  country: 'SA',
  duration: `${DEFAULT_DURATION}`,
  plan: 'standard',
  count: STARTER.lessons,
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
    discount: s.discount,
  };
}
