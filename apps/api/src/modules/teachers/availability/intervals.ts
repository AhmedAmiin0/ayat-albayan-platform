/** Half-open [start, end) in epoch ms (UTC). */
export type Interval = { start: number; end: number };

/** Sorts and unions overlapping or touching intervals; drops empty ones. */
export function mergeIntervals(list: readonly Interval[]): Interval[] {
  const sorted = list.filter((i) => i.end > i.start).toSorted((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out.at(-1);
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

/** `base` minus every interval in `cuts`. Result is merged and sorted. */
export function subtractIntervals(base: readonly Interval[], cuts: readonly Interval[]): Interval[] {
  const blockers = mergeIntervals(cuts);
  const out: Interval[] = [];
  for (const b of mergeIntervals(base)) {
    let cursor = b.start;
    for (const c of blockers) {
      if (c.end <= cursor || c.start >= b.end) continue;
      if (c.start > cursor) out.push({ start: cursor, end: c.start });
      cursor = Math.max(cursor, c.end);
    }
    if (cursor < b.end) out.push({ start: cursor, end: b.end });
  }
  return out;
}
