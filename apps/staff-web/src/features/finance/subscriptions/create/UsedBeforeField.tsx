import { Stepper } from '@/features/finance/pricing';
import { t } from '@ab/web-kit';

interface Props {
  value: number;
  /** usedBeforeMax(lessons of the chosen package): every lesson but one. */
  max: number;
  onChange: (value: number) => void;
  /** false: not asked (a start from today on); default shown. */
  shown?: boolean | undefined;
}

/** Lessons used before the platform count as used; steppers only, never typed. */
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
