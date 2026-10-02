import { PACKAGE_SIZES } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { FormLabel } from '@/payments/FormLabel';
import { Button } from '@/ui/Button';
import { FilterPills } from '@/ui/FilterPills';
import type { TrialDraft } from './draft';
import { DurationPills } from './DurationPills';

type Choice = Pick<TrialDraft, 'pkg' | 'durationMin'>;

export interface PackageStepProps {
  value: Choice;
  onChange: (patch: Partial<Choice>) => void;
  onNext: () => void;
}

/** Trial first (the usual first booking, worded as the form: «حلقة تجريبية مجانية بس»), then the paid sizes. */
const packagePills = () =>
  PACKAGE_SIZES.map((p) => ({
    value: p,
    label: p === 'trial' ? t.booking.packageTrial : t.enums.packageSize[p],
  }));

/**
 * «الباقة» (R-SCH-06), only when the chat's «اشترك» opened the wizard: the trial or a paid
 * package, and the lesson length. Before the slot step, which needs the length. The price is set
 * afterwards on the subscription screen, from the API's catalog.
 */
export function PackageStep({ value, onChange, onNext }: PackageStepProps) {
  return (
    <View style={{ gap: 12 }}>
      <FormLabel>{t.booking.pickPackage}</FormLabel>
      <FilterPills
        role="radiogroup"
        accessibilityLabel={t.booking.pickPackage}
        items={packagePills()}
        value={value.pkg}
        onChange={(pkg) => onChange({ pkg })}
      />
      {value.pkg === 'trial' ? <Note>{t.booking.trialFree}</Note> : null}
      <DurationPills
        value={value.durationMin}
        onChange={(durationMin) => onChange({ durationMin })}
      />
      <Button label={t.booking.next} onPress={onNext} />
    </View>
  );
}
