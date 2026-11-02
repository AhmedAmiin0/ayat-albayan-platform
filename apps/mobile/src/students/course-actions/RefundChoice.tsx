import { stopRefundLines, type RefundChoice as Choice } from '@ab/client-core';
import type { CourseStopPreview, StopRefund } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Field } from '@/core/ui/form/Field';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { money } from '@/payments';
import { SheetLines } from './SheetLines';

interface RefundChoiceProps {
  preview: CourseStopPreview;
  breakdown: StopRefund;
  choice: Choice;
  onChoice: (choice: Choice) => void;
  amount: string;
  onAmount: (text: string) => void;
}

/** The refund's lines, the amount (empty = the computed refund, it may only be lowered). */
function RefundLines({
  preview,
  breakdown,
  amount,
  onAmount,
}: Omit<RefundChoiceProps, 'choice' | 'onChoice'>) {
  const s = t.courseActions.stop;
  const fmt = (n: number) => money(n, preview.currency);
  const hint = s.refundAmountHint.replace('{amount}', fmt(breakdown.refund));
  return (
    <View style={{ gap: 12 }}>
      <SheetLines lines={stopRefundLines(s, breakdown, fmt)} />
      <Field
        label={s.refundAmount}
        placeholder={String(breakdown.refund)}
        value={amount}
        onChangeText={onAmount}
        keyboardType="decimal-pad"
        ltr
      />
      <SheetLines lines={[hint, s.refundWhere]} />
    </View>
  );
}

/**
 * «إلغاء فقط» / «إلغاء مع استرداد» (owner 2026-11-02): the person cancelling chooses; the sheet
 * shows paid, attended × price × rate and the refund before the confirm (as on web).
 */
export function RefundChoice(props: RefundChoiceProps) {
  const s = t.courseActions.stop;
  const items = [
    { value: 'cancel', label: s.cancelOnly },
    { value: 'refund', label: s.withRefund },
  ] as const;
  return (
    <View style={{ gap: 12 }}>
      <FilterPills
        items={items}
        value={props.choice}
        onChange={props.onChoice}
        accessibilityLabel={s.choice}
        role="radiogroup"
        wrap
      />
      {props.choice === 'refund' ? <RefundLines {...props} /> : null}
    </View>
  );
}
