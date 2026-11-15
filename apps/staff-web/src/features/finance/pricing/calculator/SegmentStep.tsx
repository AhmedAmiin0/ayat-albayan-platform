import type { ReactNode } from 'react';
import { SegmentedControl, type SegmentOption } from '@/components/ui/form/segmented-control';

export interface SegmentStepProps<V extends string> {
  /** Shown above the group and names it for assistive tech. */
  label: string;
  options: SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Under the group (the weekly package's fixed-duration note replaces the group). */
  children?: ReactNode;
  /** Hide the group, keep the label and children. */
  hidden?: boolean;
}

/** One calculator step: a label over a segmented group that wraps instead of scrolling. */
export function SegmentStep<V extends string>({
  label,
  options,
  value,
  onChange,
  children,
  hidden,
}: SegmentStepProps<V>) {
  return (
    <div className="grid content-start justify-items-start gap-1.5">
      {/* The group carries the same name; the visible label is for sighted users only. */}
      <span aria-hidden="true" className="text-xs font-semibold text-ink-2">
        {label}
      </span>
      {!hidden && (
        <SegmentedControl
          label={label}
          options={options}
          value={value}
          onChange={onChange}
          className="flex-wrap"
        />
      )}
      {children}
    </div>
  );
}
