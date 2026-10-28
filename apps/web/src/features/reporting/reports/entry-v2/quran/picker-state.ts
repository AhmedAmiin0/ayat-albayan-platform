import { ayahCount, segmentsOf, suggestRange, type MemoryView, type ReportContent, type SegmentKind, type SurahRange } from '@ab/shared';

/** What the picker edits: a part (index in content.segments) or a new one (-1) of a track. */
export interface PickTarget {
  kind: SegmentKind;
  index: number;
  /** Where it opens: the part's range, else right after the last saved one, else nothing picked. */
  start: SurahRange | null;
  /** The last saved ayah when it opened from the history («يبدأ تلقائيًا بعد آخر حفظ»). */
  after: number | null;
}

/**
 * The picker for a track's part: the part itself, or a new part right after today's last part of
 * the track, else after the student's last saved range (the history).
 */
export function pickTarget(content: ReportContent, opts: { kind: SegmentKind; index: number; memory: MemoryView | null | undefined }): PickTarget {
  const { kind, index } = opts;
  const part = index >= 0 ? content.segments[index] : undefined;
  if (part) return { kind, index, start: { surah: part.surah, from: part.from, to: part.to }, after: null };
  const today = segmentsOf(content, kind).at(-1)?.segment;
  const last = today ? { surah: today.surah, from: today.from, to: today.to } : (opts.memory?.last[kind] ?? null);
  const start = suggestRange(last);
  return { kind, index: -1, start, after: start && last ? last.to : null };
}

/** A surah picked from the list: the whole surah, unless it is the one already picked (its range stays, as on mobile). */
export function surahStart(current: SurahRange | null, surah: number): SurahRange {
  return current?.surah === surah ? current : { surah, from: 1, to: ayahCount(surah) };
}

/** Stepper / typed change, kept inside the surah with from ≤ to (moving one end pushes the other). */
export function clampRange(range: SurahRange, change: { from?: number; to?: number }): SurahRange {
  const max = ayahCount(range.surah);
  const clamp = (n: number) => Math.min(max, Math.max(1, Math.round(n)));
  if (change.from !== undefined) {
    const from = clamp(change.from);
    return { ...range, from, to: Math.max(from, range.to) };
  }
  if (change.to !== undefined) {
    const to = clamp(change.to);
    return { ...range, from: Math.min(range.from, to), to };
  }
  return range;
}
