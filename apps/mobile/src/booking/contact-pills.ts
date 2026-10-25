import { GENDERS, LEAD_SOURCES, TZ_OPTIONS, type Gender, type LeadSource } from '@ab/shared';
import { t } from '@/lib/i18n';
import type { FilterPill } from '@/core/ui/form/FilterPills';
import { cityOf } from './slots';

const NONE = { value: '', label: t.common.unset } as const;

export const TZ_PILLS = TZ_OPTIONS.map((tz) => ({ value: tz as string, label: cityOf(tz) }));

export const GENDER_PILLS: FilterPill<Gender | ''>[] = [
  NONE,
  ...GENDERS.map((g) => ({ value: g, label: t.enums.gender[g] })),
];

/**
 * «عرفت عننا منين؟»: the form's four answers. «أخرى» is not one of them, so it is offered only
 * when the lead already carries it (a prefilled answer must not vanish).
 */
export function sourcePills(current: LeadSource | null): FilterPill<LeadSource | ''>[] {
  return [
    NONE,
    ...LEAD_SOURCES.filter((s) => s !== 'other' || current === 'other').map((s) => ({
      value: s,
      label: t.enums.leadSource[s],
    })),
  ];
}
