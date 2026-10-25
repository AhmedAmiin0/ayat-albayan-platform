import type { PackageSize } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { FormLabel } from '@/payments/FormLabel';
import { Button } from '@/core/ui/primitives/Button';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import type { TrialDraft } from './draft';
import { DurationPills } from './DurationPills';
import { PAID_SIZES } from './package-choice';

type Choice = Pick<TrialDraft, 'pkg' | 'durationMin'>;

export interface PackageStepProps {
  value: Choice;
  onChange: (patch: Partial<Choice>) => void;
  onNext: () => void;
}

/** The form's paid answers: 4, 8, 12, 16 («حلقة تجريبية» is «نوع الحجز» now, not a size). */
const packagePills = (): FilterPill<PackageSize>[] =>
  PAID_SIZES.map((p) => ({ value: p, label: t.enums.packageSize[p] }));

/**
 * «الباقة» (R-SCH-06), after «نوع الحجز» says subscription: the paid package and the lesson
 * length. Before the slot step, which needs the length. The price is set afterwards on the
 * subscription screen, from the API's catalog.
 */
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
