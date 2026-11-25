import { Field, Icon, IconButton, Input, t } from '@ab/web-kit';

export interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  hint?: string | undefined;
  stepLabels?: { less: string; more: string } | undefined;
  /** false: the value is shown, never typed (only the buttons change it). */
  typed?: boolean | undefined;
}

/** Typing works unless `typed` is false, and is clamped to [min, max]. */
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
