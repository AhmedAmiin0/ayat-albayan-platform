import { tzChoices } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cityOf } from '@/booking/slots';
import { t } from '@/lib/i18n';
import { FormLabel } from '@/payments/FormLabel';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import { ErrorLine } from '../ErrorLine';
import { DayChips } from './DayChips';
import { timeOptions } from './qualification-form';
import type { QualFieldsProps } from './QualificationFields';

/** «—» first in every single choice: picking it clears the field (sent as null). */
export const CLEAR: FilterPill<''> = { value: '', label: '—' };

type TimeKey = 'preferred_from' | 'preferred_to';

/**
 * When the student can study (R-LEAD-03): zone, days, and a time range picked from 30-minute
 * choices, like the web's selects. Times are never typed (rule 6).
 */
export function PreferenceFields({ form, errors, onChange }: QualFieldsProps) {
  const group = (label: string, error: string | undefined, pills: ReactNode) => (
    <View style={{ gap: 6 }}>
      <FormLabel>{label}</FormLabel>
      {pills}
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
  const time = (key: TimeKey, label: string) =>
    group(
      label,
      errors[key],
      <FilterPills
        role="radiogroup"
        accessibilityLabel={label}
        items={[CLEAR, ...timeOptions(form[key]).map((v) => ({ value: v, label: v }))]}
        value={form[key]}
        onChange={(v) => onChange({ [key]: v })}
      />,
    );

  return (
    <View style={{ gap: 14 }}>
      {group(
        t.leads.tz,
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
        t.leads.availableDays,
        errors.available_days,
        <DayChips value={form.available_days} onChange={(available_days) => onChange({ available_days })} />,
      )}
      <FormLabel>{t.leads.preferredTime}</FormLabel>
      {time('preferred_from', t.availability.from)}
      {time('preferred_to', t.availability.to)}
    </View>
  );
}
