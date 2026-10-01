import { cn } from '@/lib/utils';

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  /** Optional real count shown after the label (tabular, ink-3). */
  count?: number;
}

export interface SegmentedControlProps<V extends string> {
  /** Group name for assistive tech, e.g. t.students.status. */
  label: string;
  options: SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
}

/** Pressed-button group on a sunk track (docs/07 seg): filters, «بتوقيتها | بتوقيت الرياض», theme. */
export function SegmentedControl<V extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<V>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex max-w-full gap-0.5 overflow-x-auto rounded-md border border-rule bg-sunk p-[3px]', className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1 text-xs sm:min-h-[30px]',
            o.value === value
              ? 'bg-raised font-semibold text-ink shadow-[0_0_0_1px_var(--rule-strong)]'
              : 'font-medium text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="font-medium text-ink-3 tabular-nums">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
