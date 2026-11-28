import type { ClockPref } from '@ab/time';
import type { SegmentSize } from '@ab/web-kit/components/ui/form/SegmentedControl';

export interface ClockToggleProps {
  /** `compact`: «Auto · 12 · 24» for a header row; the account pages keep the full names. */
  size?: SegmentSize;
  className?: string;
}

export interface ClockToggleState {
  pref: ClockPref;
  choose: (next: ClockPref) => void;
}
