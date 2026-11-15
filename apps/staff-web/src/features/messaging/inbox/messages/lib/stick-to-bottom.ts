// The chat log's scroll rule (owner, 2026-10-05): a thread opens at the newest message and stays
// pinned there as messages arrive, unless the reader scrolled up to read older ones.

export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

/** How close to the bottom (px) still counts as "at the newest message". */
export const NEAR_BOTTOM_PX = 80;

/** True when the box shows (about) its last line: a new message should keep it there. */
export function isNearBottom(m: ScrollMetrics, threshold: number = NEAR_BOTTOM_PX): boolean {
  return m.scrollHeight - m.scrollTop - m.clientHeight <= threshold;
}
