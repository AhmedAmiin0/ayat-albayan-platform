import { GENDERS, LEAD_SOURCES, type Gender, type LeadSource } from '@ab/catalog';
import { TZ_OPTIONS } from '@ab/time';
import { t, cityOf } from '@ab/mobile-kit';
import type { FilterPill } from '@ab/mobile-kit';

const NONE = { value: '', label: t.common.unset } as const;

export const TZ_PILLS = TZ_OPTIONS.map((tz) => ({ value: tz, label: cityOf(tz) }));

export const GENDER_PILLS: FilterPill<Gender | ''>[] = [
  NONE,
  ...GENDERS.map((g) => ({ value: g, label: t.enums.gender[g] })),
];

/** Other is offered only when the lead already carries it, so a prefilled answer never vanishes. */
export function sourcePills(current: LeadSource | null): FilterPill<LeadSource | ''>[] {
  return [
    NONE,
    ...LEAD_SOURCES.filter((s) => s !== 'other' || current === 'other').map((s) => ({
      value: s,
      label: t.enums.leadSource[s],
    })),
  ];
}
