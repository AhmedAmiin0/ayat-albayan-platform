import { RequiredMark } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface RadioChipsProps<V extends string> {
  /** Radio group name (unique per form). */
  name: string;
  legend: string;
  options: readonly { value: V; label: string; disabled?: boolean }[];
  value: V | null;
  onChange: (value: V) => void;
  required?: boolean;
  disabled?: boolean | undefined;
  /** The last submit attempt found it missing. */
  invalid?: boolean | undefined;
  /** Equal-width chips in a row of the same count on a phone (long labels wrap inside their chip). */
  equal?: boolean;
  /** One scrolling row on a phone instead of wrapping into many (a week of day chips). */
  scroll?: boolean;
  /** The id of what describes the choice (a live region of notes): aria-describedby on the group. */
  describedBy?: string | undefined;
}

/** A legend and native radios styled as chips (one choice, «اختيار واحد» on the forms). */
export function RadioChips<V extends string>(p: RadioChipsProps<V>) {
  return (
    <fieldset disabled={p.disabled} aria-invalid={p.invalid || undefined} aria-describedby={p.describedBy} className="grid gap-2">
      <legend className="mb-1.5 text-sm font-semibold">
        {p.legend}
        {p.required && <RequiredMark />}
      </legend>
      <div className={cn('flex flex-wrap gap-2', p.equal && 'max-[480px]:grid max-[480px]:grid-cols-3', p.scroll && 'max-[480px]:flex-nowrap max-[480px]:overflow-x-auto max-[480px]:pb-1 max-[480px]:[&>label]:shrink-0')}>
        {p.options.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input
              type="radio"
              name={p.name}
              value={o.value}
              checked={p.value === o.value}
              disabled={o.disabled}
              onChange={() => p.onChange(o.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                'inline-flex min-h-12 items-center rounded-md border px-4 text-sm font-medium text-ink-2',
                p.equal && 'max-[480px]:flex max-[480px]:h-full max-[480px]:justify-center max-[480px]:px-2 max-[480px]:py-2 max-[480px]:text-center',
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
