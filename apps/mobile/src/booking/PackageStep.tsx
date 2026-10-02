import { DURATIONS, PACKAGE_SIZES } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { FormLabel } from '@/payments/FormLabel';
import { Button } from '@/ui/Button';
import { FilterPills } from '@/ui/FilterPills';
import type { TrialDraft } from './draft';

type Choice = Pick<TrialDraft, 'pkg' | 'durationMin'>;

export interface PackageStepProps {
  value: Choice;
  onChange: (patch: Partial<Choice>) => void;
  onNext: () => void;
}

const lengths: Record<string, string | undefined> = t.enums.duration;
/** Trial first (the usual first booking), then the paid sizes in order. */
const packagePills = () => PACKAGE_SIZES.map((p) => ({ value: p, label: t.enums.packageSize[p] }));
const lengthPills = () =>
  DURATIONS.map((d) => ({ value: `${d}` as const, label: lengths[String(d)] ?? String(d) }));

/**
 * «الباقة» (R-SCH-06), only when the chat's «اشترك» opened the wizard: the trial, or a paid
 * package with its lesson length. Before the slot step, which needs the length. The price is set
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
      {value.pkg === 'trial' ? (
        <Note>{t.booking.trialFree}</Note>
      ) : (
        <>
          <FormLabel>{t.booking.pickDuration}</FormLabel>
          <FilterPills
            role="radiogroup"
            accessibilityLabel={t.booking.pickDuration}
            items={lengthPills()}
            value={`${value.durationMin}`}
            onChange={(next) => {
              const durationMin = DURATIONS.find((d) => `${d}` === next);
              if (durationMin) onChange({ durationMin });
            }}
          />
        </>
      )}
      <Button label={t.booking.next} onPress={onNext} />
    </View>
  );
}
