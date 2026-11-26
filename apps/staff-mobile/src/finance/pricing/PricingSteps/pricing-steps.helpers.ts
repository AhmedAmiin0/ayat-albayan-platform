import { DISCOUNTS, SITE_COUNTRIES } from '@ab/money';
import { t, type FilterPill } from '@ab/mobile-kit';
import type { CountryChoice } from '@/finance/pricing/selection';

const p = t.pricing;

export const COUNTRIES: readonly FilterPill<CountryChoice>[] = [
  ...SITE_COUNTRIES.map((c) => ({ value: c, label: p.countries[c] })),
  { value: 'other', label: p.otherCountry },
];
export const DISCOUNT_PILLS = DISCOUNTS.map((d) => {
  const value = `${d}` as const;
  return { value, label: p.discounts[value] };
});
