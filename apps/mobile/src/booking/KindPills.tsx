import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { FormLabel } from '@/payments/FormLabel';
import { FilterPills } from '@/ui/FilterPills';
import type { TrialDraft } from './draft';

export interface KindPillsProps {
  value: TrialDraft['kind'];
  onChange: (kind: TrialDraft['kind']) => void;
}

const kinds = [
  { value: 'trial', label: t.booking.kind.trial },
  { value: 'package', label: t.booking.kind.package },
] as const;

/**
 * «نوع الحجز *» on the first step. A lead is not a registered student yet, so «حجز تعويضي» is not
 * a choice here: the hint says where it lives (the missed lesson's row in the schedule).
 */
export function KindPills({ value, onChange }: KindPillsProps) {
  return (
    <View style={{ gap: 8 }}>
      <FormLabel>{`${t.booking.kind.label} *`}</FormLabel>
      <FilterPills
        role="radiogroup"
        wrap
        accessibilityLabel={t.booking.kind.label}
        items={kinds}
        value={value}
        onChange={onChange}
      />
      <Note>{t.booking.mobile.makeupHint}</Note>
    </View>
  );
}
