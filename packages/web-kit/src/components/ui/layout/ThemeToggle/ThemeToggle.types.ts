import type { ThemePref } from '@ab/web-kit/lib/theme';
import type { SegmentSize } from '@ab/web-kit/components/ui/form/SegmentedControl';

export interface ThemeToggleProps {
  /** `compact`: icon-only segments for a header row; the account pages keep the labels. */
  size?: SegmentSize;
  className?: string;
}

export interface ThemeToggleState {
  pref: ThemePref;
  choose: (next: ThemePref) => void;
}
