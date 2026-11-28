import type { IconName } from '@ab/web-kit/components/ui/display/icon';

/** `compact`: a header row's form, each segment showing its icon or short text. */
export type SegmentSize = 'regular' | 'compact';

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  /** Optional real count shown after the label (tabular, ink-3). */
  count?: number;
  /** Compact only: drawn instead of the label, which stays the segment's name. */
  icon?: IconName;
  /** Compact only: shown instead of the label when there is no icon; the name must contain it. */
  short?: string;
}

export interface SegmentedControlProps<V extends string> {
  /** Group name for assistive tech, e.g. t.students.status. */
  label: string;
  options: SegmentOption<V>[];
  /** The pressed segment; null = none (a state no segment stands for, e.g. two statuses). */
  value: V | null;
  onChange: (value: V) => void;
  size?: SegmentSize;
  className?: string;
}
