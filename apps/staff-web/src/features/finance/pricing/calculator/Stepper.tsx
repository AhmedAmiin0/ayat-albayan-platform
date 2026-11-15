import { Field } from '@/components/ui/form/field';
import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';

export interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  hint?: string | undefined;
  /** The − / + buttons' names; default «أقل» / «أكثر». */
  stepLabels?: { less: string; more: string } | undefined;
  /** false: the value is shown, never typed (only the buttons change it). */
  typed?: boolean | undefined;
}

/** «أقل | n | أكثر» for whole numbers in [min, max]; typing works too (unless `typed` is false) and is clamped. */
export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  hint,
  stepLabels,
  typed = true,
}: StepperProps) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, n)));
  const names = stepLabels ?? { less: t.pricing.decrease, more: t.pricing.increase };
  return (
    <Field label={label} hint={hint}>
      {(control) => (
        <div role="group" aria-label={label} className="flex items-center gap-1.5">
          <IconButton
            label={names.less}
            disabled={value <= min}
            onClick={() => set(value - 1)}
            className="border border-input"
          >
            <Icon name="minus" />
          </IconButton>
          {typed ? (
            <Input
              {...control}
              type="number"
              inputMode="numeric"
              dir="ltr"
              min={min}
              max={max}
              value={value}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                if (Number.isInteger(n)) set(n);
              }}
              className="w-20 text-center tabular-nums [&[dir=ltr]]:text-center"
            />
          ) : (
            <output
              {...control}
              aria-live="polite"
              dir="ltr"
              className="w-12 text-center font-semibold tabular-nums text-ink"
            >
              {value}
            </output>
          )}
          <IconButton
            label={names.more}
            disabled={value >= max}
            onClick={() => set(value + 1)}
            className="border border-input"
          >
            <Icon name="plus" />
          </IconButton>
        </div>
      )}
    </Field>
  );
}
