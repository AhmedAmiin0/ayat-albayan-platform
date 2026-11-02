import { stopRefundLines, type RefundChoice } from '@ab/client-core';
import type { CourseStopPreview } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { RadioChips } from '@/components/ui/form/radio-chips';
import { moneyText } from '@/features/finance/subscriptions';
import { t } from '@/lib/i18n/i18n';

export interface StopRefundChoiceProps {
  preview: CourseStopPreview;
  choice: RefundChoice;
  onChoice: (choice: RefundChoice) => void;
  amount: string;
  onAmount: (text: string) => void;
}

/** The refund's lines and the amount (empty = the computed refund, it may only be lowered). */
function RefundLines({
  preview,
  amount,
  onAmount,
}: Omit<StopRefundChoiceProps, 'choice' | 'onChoice'>) {
  const words = t.courseActions.stop;
  const money = (n: number) => moneyText(n, preview.currency);
  const max = money(preview.refund.refund);
  return (
    <>
      <ul role="status" className="grid list-disc gap-1 rounded-md bg-sunk px-7 py-2.5 text-sm">
        {stopRefundLines(words, preview.refund, money).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <Field label={words.refundAmount} hint={words.refundAmountHint.replace('{amount}', max)}>
        {(p) => (
          <Input
            {...p}
            inputMode="decimal"
            value={amount}
            placeholder={String(preview.refund.refund)}
            onChange={(e) => onAmount(e.target.value)}
          />
        )}
      </Field>
      <p className="text-sm text-ink-2">{words.refundWhere}</p>
    </>
  );
}

/**
 * «إلغاء فقط» / «إلغاء مع استرداد» (owner 2026-11-02): the person cancelling chooses; the sheet
 * shows paid, attended × price × rate and the refund before the confirm.
 */
export function StopRefundChoice(props: StopRefundChoiceProps) {
  const words = t.courseActions.stop;
  const options = [
    { value: 'cancel', label: words.cancelOnly },
    { value: 'refund', label: words.withRefund },
  ] as const;
  return (
    <div className="grid gap-3">
      <RadioChips
        name="course-stop-refund"
        legend={words.choice}
        options={options}
        value={props.choice}
        onChange={props.onChoice}
        equal
      />
      {props.choice === 'refund' && <RefundLines {...props} />}
    </div>
  );
}
