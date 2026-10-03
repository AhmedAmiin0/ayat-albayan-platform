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

// A makeup is not a choice here: it needs a registered student and the lesson it replaces, so it
// starts from the missed lesson's row and the hint below says so.
const kinds: FilterPill<Exclude<BookingKind, 'makeup'>>[] = [
  { value: 'trial', label: t.booking.kind.trial },
  { value: 'package', label: t.booking.kind.package },
];

/**
 * «نوع الحجز *» on the first step: «حلقة تجريبية مجانية بس» · «اشتراك». «حجز تعويضي» is the third
 * type but lives on the missed lesson's row in the schedule (R-SCH-10); the hint says so.
 */
export function KindPills({ value, onChange }: KindPillsProps) {
  return (
    <View style={{ gap: 8 }}>
      <FormLabel required>{t.booking.kind.label}</FormLabel>
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
