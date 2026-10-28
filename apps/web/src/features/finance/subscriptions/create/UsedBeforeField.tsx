import { Stepper } from '@/features/finance/pricing';
import { t } from '@/lib/i18n/i18n';

type Props = {
  value: number;
  /** usedBeforeMax(lessons of the chosen package): one lesson left per course day. */
  max: number;
  onChange: (value: number) => void;
  /** false: not asked (a start from today on); default shown. */
  shown?: boolean | undefined;
};

/**
 * «حلقات مستخدمة من الباقة» (owner 2026-10-28): lessons the student took before the platform, with a
 * package that already started. Counted as used; the course books the rest. − / + only, never typed.
 */
export function UsedBeforeField({ value, max, onChange, shown = true }: Props) {
  if (!shown) return null;
  return (
    <Stepper
      label={t.salesMoney.usedBefore}
      hint={t.salesMoney.usedBeforeHint}
      value={Math.min(value, max)}
      min={0}
      max={max}
      onChange={onChange}
      stepLabels={{ less: t.salesMoney.usedBeforeLess, more: t.salesMoney.usedBeforeMore }}
      typed={false}
    />
  );
}
