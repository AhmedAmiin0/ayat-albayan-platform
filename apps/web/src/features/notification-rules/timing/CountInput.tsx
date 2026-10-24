import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// The browser's spin arrows sit over the digits of a narrow box: hidden (the keyboard still steps).
const NO_SPIN = '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

export interface CountInputProps {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  bounds: { min: number; max: number };
  disabled?: boolean;
  /** The bounds / error lines under the editor. */
  describedBy?: string | undefined;
  invalid?: boolean;
}

/** A bounded whole number with its visible label and unit (rule 6: a count, never a time of day). */
export function CountInput({ label, unit, value, onChange, bounds, disabled, describedBy, invalid }: CountInputProps) {
  const id = useId();
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <label htmlFor={id} className="text-xs text-ink-2">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        dir="ltr"
        min={bounds.min}
        max={bounds.max}
        value={value}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn('w-20 tabular-nums', NO_SPIN)}
      />
      <span className="text-xs text-ink-3">{unit}</span>
    </span>
  );
}
