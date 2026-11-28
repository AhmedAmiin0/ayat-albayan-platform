import { z } from 'zod';
import { shareFlagSchema } from './stacked-bar.schemas';
import type { DrawnSegment, ShareSegment } from './StackedBar.types';

// Neutral segments alternate four inks; saffron and danger are kept for flagged ones (docs/66 §2).
const NEUTRAL_FILLS = ['bg-ink-3', 'bg-ink-2', 'bg-rule-strong', 'bg-ink'] as const;

const FLAG_FILL = z.record(shareFlagSchema, z.string()).readonly().decode({
  act: 'bg-act',
  bad: 'bg-danger',
});
const FLAG_INK = z.record(shareFlagSchema, z.string()).readonly().decode({
  act: 'text-act',
  bad: 'text-danger',
});

function neutralFill(index: number): string {
  return NEUTRAL_FILLS[index % NEUTRAL_FILLS.length] ?? 'bg-ink-3';
}

export function totalOf(segments: readonly ShareSegment[]): number {
  return segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
}

/** Each segment with its share of the total; negative values count as zero. */
export function drawSegments(segments: readonly ShareSegment[]): DrawnSegment[] {
  const total = totalOf(segments);
  return segments.map((s, i) => {
    const share = total > 0 ? Math.max(0, s.value) / total : 0;
    return {
      ...s,
      share,
      percent: `${Math.round(share * 100)}%`,
      fill: s.flag === undefined ? neutralFill(i) : FLAG_FILL[s.flag],
      ink: s.flag === undefined ? 'text-ink-2' : FLAG_INK[s.flag],
    };
  });
}
