import { clampPosition, SKIP_SECONDS } from './player-math';

// The seek slider (role slider / adjustable): arrows move ±10 s, Home and End jump to the ends,
// and a tap or a drag lands on its share of the bar. The bar fills from the reading start, so in
// a right-to-left page the left arrow moves forward.

/** Steps of ±10 s per key; the horizontal arrows read the page direction. */
const STEPS: Record<string, (rtl: boolean) => number> = {
  ArrowUp: () => 1,
  PageUp: () => 1,
  ArrowDown: () => -1,
  PageDown: () => -1,
  ArrowRight: (rtl) => (rtl ? -1 : 1),
  ArrowLeft: (rtl) => (rtl ? 1 : -1),
};

const JUMPS: Record<string, (duration: number) => number> = {
  Home: () => 0,
  End: (duration) => duration,
};

interface SeekKey {
  key: string;
  position: number;
  duration: number;
  rtl: boolean;
}

/** Where a key moves the play; null for a key the slider does not use. */
export function seekByKey(input: SeekKey): number | null {
  const step = STEPS[input.key];
  const jump = JUMPS[input.key];
  const to = step
    ? input.position + step(input.rtl) * SKIP_SECONDS
    : jump?.(input.duration);
  return to === undefined ? null : clampPosition(to, input.duration);
}

interface SeekPoint {
  /** The touch's distance from the bar's physical left edge. */
  x: number;
  width: number;
  duration: number;
  rtl: boolean;
}

/** The position under a tap or a drag on the bar (0 while the length is unknown). */
export function seekAtPoint(input: SeekPoint): number {
  if (input.width <= 0) return 0;
  const share = Math.min(Math.max(input.x / input.width, 0), 1);
  const along = input.rtl ? 1 - share : share;
  return clampPosition(along * input.duration, input.duration);
}
