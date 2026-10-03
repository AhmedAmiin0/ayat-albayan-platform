import { RequiredMark } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface RadioChipsProps<V extends string> {
  /** Radio group name (unique per form). */
  name: string;
  legend: string;
  options: readonly { value: V; label: string }[];
  value: V | null;
  onChange: (value: V) => void;
  required?: boolean;
  disabled?: boolean | undefined;
  /** The last submit attempt found it missing. */
  invalid?: boolean | undefined;
}

/** A legend and native radios styled as chips (one choice, «اختيار واحد» on the forms). */
export function RadioChips<V extends string>(p: RadioChipsProps<V>) {
  return (
    <fieldset disabled={p.disabled} aria-invalid={p.invalid || undefined} className="grid gap-2">
      <legend className="mb-2 font-display text-h3 font-bold">
        {p.legend}
        {p.required && <RequiredMark />}
      </legend>
      <div className="flex flex-wrap gap-2">
        {p.options.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input
              type="radio"
              name={p.name}
              value={o.value}
              checked={p.value === o.value}
              onChange={() => p.onChange(o.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                'inline-flex min-h-12 items-center rounded-md border px-4 text-sm font-medium text-ink-2',
                p.invalid ? 'border-danger' : 'border-input',
                'peer-checked:border-primary peer-checked:bg-lapis-wash peer-checked:font-semibold peer-checked:text-ink',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                'hover:bg-sunk peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
              )}
            >
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
