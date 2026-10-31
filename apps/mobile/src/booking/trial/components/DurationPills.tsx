import { DURATIONS, type Duration } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { FormLabel } from '@/payments/FormLabel';
import { FilterPills } from '@/core/ui/form/FilterPills';

const lengths: Record<string, string | undefined> = t.enums.duration;
const pills = () =>
  DURATIONS.map((d) => ({ value: `${d}` as const, label: lengths[String(d)] ?? String(d) }));

interface DurationPillsProps {
  value: Duration;
  onChange: (minutes: Duration) => void;
}

/** «مدة الحلقة»: the form's «المده» choices (30 / 45 / 60 / 90) with its help text, 45 by default. */
export function DurationPills({ value, onChange }: DurationPillsProps) {
  return (
    <View style={{ gap: 6 }}>
      <FormLabel>{t.booking.pickDuration}</FormLabel>
      <FilterPills
        role="radiogroup"
        wrap
        accessibilityLabel={t.booking.pickDuration}
        items={pills()}
        value={`${value}`}
        onChange={(next) => {
          const minutes = DURATIONS.find((d) => `${d}` === next);
          if (minutes) onChange(minutes);
        }}
      />
      <Note>{t.booking.durationHint}</Note>
    </View>
  );
}
