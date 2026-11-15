import type { Span } from '@ab/shared';

// The «الجدول» spans (availability windows, free gaps) cut to the period on screen. Pure.

const QUARTER = 15 * 60_000;
/** Bookable free gaps are at least 30 min (the web board's rule). */
const MIN_GAP = 30 * 60_000;
const ms = (iso: string) => Date.parse(iso);

export function clip(span: Span, from: number, to: number): Span | null {
  const a = Math.max(ms(span.starts_at), from);
  const b = Math.min(ms(span.ends_at), to);
  return a < b
    ? { starts_at: new Date(a).toISOString(), ends_at: new Date(b).toISOString() }
    : null;
}

export const clipAll = (spans: readonly Span[], from: number, to: number): Span[] =>
  spans.flatMap((s) => clip(s, from, to) ?? []);

/**
 * Touching spans as one: the API's windows are cut at Riyadh midnight, so a Cairo viewer's all-day
 * availability would read «00:00 – 23:00، 23:00 – 24:00» instead of «00:00 – 24:00».
 */
export function joined(spans: readonly Span[]): Span[] {
  const out: Span[] = [];
  for (const s of [...spans].sort((a, b) => ms(a.starts_at) - ms(b.starts_at))) {
    const prev = out.at(-1);
    if (prev && ms(s.starts_at) <= ms(prev.ends_at)) {
      if (ms(s.ends_at) > ms(prev.ends_at)) prev.ends_at = s.ends_at;
    } else out.push({ ...s });
  }
  return out;
}

/** Free gaps still ahead: clipped to the period and to `now`, short remainders dropped. */
export const freeAhead = (
  spans: readonly Span[],
  period: { from: number; to: number; now?: Date | undefined },
): Span[] => {
  const after = period.now ? Math.ceil(period.now.getTime() / QUARTER) * QUARTER : 0;
  return clipAll(spans, Math.max(period.from, after), period.to).filter(
    (s) => ms(s.ends_at) - ms(s.starts_at) >= MIN_GAP,
  );
};
