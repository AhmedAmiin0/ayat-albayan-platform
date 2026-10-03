import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { FormLabel } from '@/payments/FormLabel';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import type { BookingKind } from './contract';
import type { TrialDraft } from './draft';

export interface KindPillsProps {
  value: TrialDraft['kind'];
  onChange: (kind: TrialDraft['kind']) => void;
}

const kinds: FilterPill<BookingKind>[] = [
  { value: 'trial', label: t.booking.kind.trial },
  { value: 'package', label: t.booking.kind.package },
  // A lead is not a registered student yet: a makeup needs one (and the lesson it replaces).
  { value: 'makeup', label: t.booking.kind.makeup, disabled: true },
];

/**
 * «نوع الحجز *» on the first step: «حلقة تجريبية مجانية بس» · «اشتراك» · «حجز تعويضي». The third
 * is shown but disabled on a lead, and the hint says where it lives: the missed lesson's row in
 * the schedule (R-SCH-10).
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
        onChange={(kind) => {
          if (kind !== 'makeup') onChange(kind);
        }}
      />
      <Note>{t.booking.mobile.makeupHint}</Note>
    </View>
  );
}
