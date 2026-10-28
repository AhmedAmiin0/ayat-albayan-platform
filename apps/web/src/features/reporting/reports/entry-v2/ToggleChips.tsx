import { cn } from '@/lib/utils';

export interface ToggleChipsProps<V extends string> {
  /** The group's name for assistive tech (its heading is outside). */
  label: string;
  options: readonly { value: V; label: string }[];
  selected: readonly V[];
  onToggle: (value: V) => void;
}

/** Chips that turn on and off (aria-pressed): the tajweed topic and the quick notes to the family. */
export function ToggleChips<V extends string>({ label, options, selected, onToggle }: ToggleChipsProps<V>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o.value)}
            className={cn(
              'min-h-11 rounded-full border px-3 text-sm font-semibold sm:min-h-9',
              on ? 'border-primary bg-primary text-primary-foreground' : 'border-rule bg-sunk text-ink-2 hover:bg-lapis-wash',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
