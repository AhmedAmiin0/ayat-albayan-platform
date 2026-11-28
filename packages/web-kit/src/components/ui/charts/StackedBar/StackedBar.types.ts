import type { Glyph } from '@ab/money';
import type { ShareFlag } from './stacked-bar.schemas';

export interface ShareSegment {
  key: string;
  label: string;
  value: number;
  /** The status shape shown in the legend, so a segment never rests on its shade alone. */
  glyph: Glyph;
  /** Only a segment that needs attention leaves the neutral inks. */
  flag?: ShareFlag;
  /** The printed value, e.g. a formatted amount; the plain number when absent. */
  valueLabel?: string;
  /** Makes the legend entry a button, e.g. to filter a table by this segment. */
  onSelect?: () => void;
}

export interface StackedBarProps {
  /** The chart's accessible name. */
  label: string;
  segments: readonly ShareSegment[];
  /** Shown instead of the bar when every segment is zero. */
  empty?: string;
}

export interface DrawnSegment extends ShareSegment {
  share: number;
  percent: string;
  fill: string;
  ink: string;
}
