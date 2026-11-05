import { GENDERS, tzChoices, tzOptionLabel } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

const city = (id: string): string | undefined => (t.tz as Record<string, string | undefined>)[id];

/** The zone pills: the curated list (and the stored zone), never typed (rule 6). */
export const zoneItems = (tz: string) =>
  tzChoices(tz).map((id) => ({ value: id, label: tzOptionLabel(id, city(id)) }));

/** The gender pills, with an empty «none» first ('' = not set). */
export const genderItems = (none: string) => [
  { value: '', label: none },
  ...GENDERS.map((g) => ({ value: g, label: t.enums.gender[g] })),
];
