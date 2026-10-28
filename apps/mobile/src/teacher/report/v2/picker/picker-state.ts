import { ayahCount, suggestRange, type SurahRange } from '@ab/shared';

// The surah picker's draft (docs/design/report-form/SurahPicker): a surah (none yet on a first
// lesson) and a from–to ayah range, always 1 ≤ from ≤ to ≤ the surah's ayah count.

export interface PickerDraft {
  surah: number | null;
  from: number;
  to: number;
}

/** Where the sheet opens, and the last saved ayah it continues from (null: not from history). */
export interface PickerStart {
  draft: PickerDraft;
  afterAyah: number | null;
}

/** An existing part opens on its own range; an empty one right after the last saved ayah; else nothing picked. */
export function startDraft(opts: {
  current: SurahRange | null;
  last: SurahRange | null;
}): PickerStart {
  if (opts.current) return { draft: { ...opts.current }, afterAyah: null };
  const next = suggestRange(opts.last);
  if (next && opts.last) return { draft: next, afterAyah: opts.last.to };
  return { draft: { surah: null, from: 1, to: 1 }, afterAyah: null };
}

/** A tapped surah: the whole surah, unless it is the one already picked (its range stays). */
export function pickSurah(d: PickerDraft, surah: number): PickerDraft {
  return d.surah === surah ? d : { surah, from: 1, to: ayahCount(surah) };
}

const clamp = (n: number, max: number) => Math.min(max, Math.max(1, Math.round(n)));

/** A stepper or typed value: clamped into the surah; the other end follows so from ≤ to. */
export function setBound(
  d: PickerDraft,
  change: { end: 'from' | 'to'; value: number },
): PickerDraft {
  if (d.surah === null || !Number.isFinite(change.value)) return d;
  const v = clamp(change.value, ayahCount(d.surah));
  return change.end === 'from'
    ? { ...d, from: v, to: Math.max(d.to, v) }
    : { ...d, to: v, from: Math.min(d.from, v) };
}

/** The range «تمّ» writes, or null while no surah is picked. */
export const rangeOf = (d: PickerDraft): SurahRange | null =>
  d.surah === null ? null : { surah: d.surah, from: d.from, to: d.to };

/** Digits typed into a stepper whose editing has not ended yet, per end. */
export type PendingText = Partial<Record<'from' | 'to', string>>;

/** «تمّ» while a number is still being typed: each end's digits apply as a commit would. */
export function applyTyped(d: PickerDraft, typed: PendingText): PickerDraft {
  return (['from', 'to'] as const).reduce((acc, end) => {
    const digits = typed[end]?.replace(/\D/g, '') ?? '';
    return digits === '' ? acc : setBound(acc, { end, value: Number(digits) });
  }, d);
}
