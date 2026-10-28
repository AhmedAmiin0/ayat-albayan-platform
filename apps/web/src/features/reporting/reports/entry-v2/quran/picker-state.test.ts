import { emptyContent, type MemoryView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { clampRange, pickTarget, surahStart } from './picker-state';

const memory: MemoryView = {
  last: { recited: null, new: { surah: 67, from: 1, to: 15 }, revision: { surah: 114, from: 1, to: 6 } },
  recent_surahs: [67, 68],
};

describe('picker state (surah / ayah range)', () => {
  it('a new part opens right after the last saved range, and says from which ayah', () => {
    expect(pickTarget(emptyContent(), { kind: 'new', index: -1, memory })).toEqual({
      kind: 'new',
      index: -1,
      start: { surah: 67, from: 16, to: 30 },
      after: 15,
    });
  });

  it('no history (or after الناس): nothing picked', () => {
    expect(pickTarget(emptyContent(), { kind: 'recited', index: -1, memory }).start).toBeNull();
    expect(pickTarget(emptyContent(), { kind: 'revision', index: -1, memory })).toMatchObject({ start: null, after: null });
    expect(pickTarget(emptyContent(), { kind: 'new', index: -1, memory: null }).start).toBeNull();
  });

  it('an existing part opens on its own range', () => {
    const content = { ...emptyContent(), segments: [{ kind: 'new' as const, surah: 68, from: 1, to: 5, grade: null }] };
    expect(pickTarget(content, { kind: 'new', index: 0, memory })).toEqual({
      kind: 'new',
      index: 0,
      start: { surah: 68, from: 1, to: 5 },
      after: null,
    });
  });

  it('a picked surah is the whole surah; the one already picked keeps its range', () => {
    expect(surahStart(null, 67)).toEqual({ surah: 67, from: 1, to: 30 });
    expect(surahStart({ surah: 67, from: 16, to: 22 }, 67)).toEqual({ surah: 67, from: 16, to: 22 });
    expect(surahStart({ surah: 67, from: 16, to: 22 }, 112)).toEqual({ surah: 112, from: 1, to: 4 });
  });

  it('another part of a track continues after today’s last part, not the history', () => {
    const content = { ...emptyContent(), segments: [{ kind: 'new' as const, surah: 67, from: 16, to: 22, grade: null }] };
    expect(pickTarget(content, { kind: 'new', index: -1, memory })).toMatchObject({ start: { surah: 67, from: 23, to: 29 }, after: 22 });
  });

  it('keeps the range inside the surah, from ≤ to', () => {
    const r = { surah: 67, from: 16, to: 22 };
    expect(clampRange(r, { from: 0 })).toEqual({ surah: 67, from: 1, to: 22 });
    expect(clampRange(r, { from: 25 })).toEqual({ surah: 67, from: 25, to: 25 });
    expect(clampRange(r, { to: 99 })).toEqual({ surah: 67, from: 16, to: 30 });
    expect(clampRange(r, { to: 10 })).toEqual({ surah: 67, from: 10, to: 10 });
    expect(clampRange(r, {})).toBe(r);
  });
});
