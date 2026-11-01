import { GROUP_KINDS, tzChoices, type GroupKind } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cityOf } from '@/booking/shared/slots';
import { t } from '@/core/lib/i18n/i18n';
import { FormLabel } from '@/core/ui/form/FormLabel';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { DayChips } from './DayChips';
import { timeOptions } from './qualification-form';
import type { QualFieldsProps } from './QualificationFields';
import { QualText } from './QualText';
import { hhmm, useClockCycle } from '@/core/lib/clock';

/** «—» first in every single choice: picking it clears the field (sent as null). */
export const CLEAR: FilterPill<''> = { value: '', label: t.common.unset };

type TimeKey = 'preferred_from' | 'preferred_to';

const GROUP_PILLS = (): FilterPill<GroupKind | ''>[] => [
  CLEAR,
  ...GROUP_KINDS.map((v) => ({ value: v, label: t.leads.groupKindOption[v] })),
];

/**
 * When and how the student can study (R-LEAD-03), in the old form's order: days, a start-time
 * range picked from 30-minute choices (never typed, rule 6), the zone they attend in, the lesson
 * type, then «ملاحظات أو طلبات خاصة».
 */
export function PreferenceFields(props: QualFieldsProps) {
  const cycle = useClockCycle();
  const { form, errors, onChange } = props;
  const group = (label: string, error: string | undefined, pills: ReactNode) => (
    <View style={{ gap: 6 }}>
      <FormLabel>{label}</FormLabel>
      {pills}
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
  // A long row scrolls: the label carries the pick, so it shows even when its pill is off screen.
  const time = (key: TimeKey, label: string) =>
    group(
      form[key] ? `${label} ${hhmm(form[key], cycle)}` : label,
      errors[key],
      <FilterPills
        role="radiogroup"
        accessibilityLabel={label}
        items={[CLEAR, ...timeOptions(form[key]).map((v) => ({ value: v, label: hhmm(v, cycle) }))]}
        value={form[key]}
        onChange={(v) => onChange({ [key]: v })}
      />,
    );

  return (
    <View style={{ gap: 14 }}>
      {group(
        t.leads.availableDays,
        errors.available_days,
        <DayChips
          value={form.available_days}
          onChange={(available_days) => onChange({ available_days })}
        />,
      )}
      <FormLabel>{t.leads.preferredTime}</FormLabel>
      {time('preferred_from', t.availability.from)}
      {time('preferred_to', t.availability.to)}
      {group(
        form.tz ? `${t.leads.tz} · ${cityOf(form.tz)}` : t.leads.tz,
        errors.tz,
        <FilterPills
          role="radiogroup"
          accessibilityLabel={t.leads.tz}
          items={[CLEAR, ...tzChoices(form.tz).map((id) => ({ value: id, label: cityOf(id) }))]}
          value={form.tz}
          onChange={(tz) => onChange({ tz })}
        />,
      )}
      {group(
        t.leads.groupKind,
        errors.group_kind,
        <FilterPills
          role="radiogroup"
          accessibilityLabel={t.leads.groupKind}
          items={GROUP_PILLS()}
          value={form.group_kind}
          onChange={(group_kind) => onChange({ group_kind })}
        />,
      )}
      <QualText {...props} field="notes" label={t.leads.notes} multiline />
    </View>
  );
}
