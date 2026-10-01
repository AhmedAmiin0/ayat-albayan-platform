import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';

export interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  hint?: string | undefined;
}

// ponytail: icon.tsx has no minus yet; drawn here on the same 20px grid as <Icon>.
function Minus() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      className="size-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
    >
      <path d="M4.5 10h11" />
    </svg>
  );
}

/** «أقل | n | أكثر» for whole numbers in [min, max]; typing works too and is clamped. */
export function Stepper({ label, value, min, max, onChange, hint }: StepperProps) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, n)));
  return (
    <Field label={label} hint={hint}>
      {(control) => (
        <div role="group" aria-label={label} className="flex items-center gap-1.5">
          <IconButton
            label={t.pricing.decrease}
            disabled={value <= min}
            onClick={() => set(value - 1)}
            className="border border-input"
          >
            <Minus />
          </IconButton>
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
          <IconButton
            label={t.pricing.increase}
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
