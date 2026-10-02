import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  /** A list of numbers («24، 72») instead of one. */
  list?: boolean;
  disabled?: boolean;
}

/** A count (hours, weeks, lessons, minutes): LTR digits, never a time of day (rule 6). */
export function NumberField({ label, value, onChange, hint, error, list, disabled }: NumberFieldProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(p) => (
        <Input
          {...p}
          type={list ? 'text' : 'number'}
          inputMode="numeric"
          dir="ltr"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[180px] tabular-nums"
        />
      )}
    </Field>
  );
}

export interface CheckFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}

/** An on/off setting as a labelled checkbox (the hint says what OFF means). */
export function CheckField({ label, checked, onChange, hint }: CheckFieldProps) {
  return (
    <div className="grid gap-1">
      <label className="flex min-h-11 items-center gap-2.5 text-sm font-semibold sm:min-h-8">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 accent-[var(--lapis)]"
        />
        <span>{label}</span>
      </label>
      {hint && <p className="ps-[26px] text-xs text-ink-3">{hint}</p>}
    </div>
  );
}
