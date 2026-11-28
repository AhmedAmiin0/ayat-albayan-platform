import type { ReactNode } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { cn } from '@ab/web-kit/lib/utils';
import type { SegmentOption, SegmentedControlProps, SegmentSize } from './SegmentedControl.types';

// Compact segments match the kit's icon buttons: 44 px on touch and under 640 px, 34 px otherwise.
const SEGMENT: Record<SegmentSize, string> = {
  regular: 'gap-1.5 px-3 py-1 sm:min-h-[30px]',
  compact:
    'min-w-11 justify-center px-1.5 sm:min-h-8.5 sm:min-w-8.5 pointer-coarse:min-h-11 pointer-coarse:min-w-11',
};

const TRACK: Record<SegmentSize, string> = { regular: 'p-[3px]', compact: 'shrink-0 p-0.5' };

const isShortened = <V extends string>(o: SegmentOption<V>, size: SegmentSize) =>
  size === 'compact' && (o.icon !== undefined || o.short !== undefined);

const textOf = <V extends string>(o: SegmentOption<V>, size: SegmentSize) =>
  isShortened(o, size) ? o.short : o.label;

const segmentBody = <V extends string>(o: SegmentOption<V>, size: SegmentSize): ReactNode =>
  size === 'compact' && o.icon ? <Icon name={o.icon} /> : textOf(o, size);

/** Pressed-button group on a sunk track (docs/07 seg). */
export function SegmentedControl<V extends string>({
  label,
  options,
  value,
  onChange,
  size = 'regular',
  className,
}: SegmentedControlProps<V>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex max-w-full gap-0.5 overflow-x-auto rounded-md border border-rule bg-sunk',
        TRACK[size],
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          aria-label={isShortened(o, size) ? o.label : undefined}
          title={isShortened(o, size) ? o.label : undefined}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex min-h-11 items-center whitespace-nowrap rounded-sm text-xs',
            SEGMENT[size],
            o.value === value
              ? 'bg-raised font-semibold text-ink shadow-[0_0_0_1px_var(--rule-strong)]'
              : 'font-medium text-ink-2 hover:text-ink',
          )}
        >
          {segmentBody(o, size)}
          {o.count !== undefined && (
            <span className="font-medium text-ink-3 tabular-nums">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
