import type { PackageSize } from '@ab/catalog';
import { View } from 'react-native';
import { t, Button, FilterPills, type FilterPill, FormLabel } from '@ab/mobile-kit';
import type { TrialDraft } from '@/booking/trial/lib/draft';
import { DurationPills } from './DurationPills';
import { PAID_SIZES } from '@/booking/trial/lib/package-choice';

type Choice = Pick<TrialDraft, 'pkg' | 'durationMin'>;

export interface PackageStepProps {
  value: Choice;
  onChange: (patch: Partial<Choice>) => void;
  onNext: () => void;
}

/** Paid sizes 4, 8, 12, 16; the trial is a booking type now, not a size. */
const packagePills = (): FilterPill<PackageSize>[] =>
  PAID_SIZES.map((p) => ({ value: p, label: t.enums.packageSize[p] }));

/** R-SCH-06: before the slot step, which needs the length; price is set on the subscription. */
export function PackageStep({ value, onChange, onNext }: PackageStepProps) {
  return (
    <View style={{ gap: 12 }}>
      <FormLabel required>{t.booking.pickPackage}</FormLabel>
      <FilterPills
        role="radiogroup"
        wrap
        accessibilityLabel={t.booking.pickPackage}
        items={packagePills()}
        value={value.pkg}
        onChange={(pkg) => onChange({ pkg })}
      />
      <DurationPills
        value={value.durationMin}
        onChange={(durationMin) => onChange({ durationMin })}
      />
      <Button label={t.booking.next} onPress={onNext} />
    </View>
  );
}
