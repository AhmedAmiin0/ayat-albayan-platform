import { applyTyped, pickSurah, rangeOf, setBound, startDraft } from './picker-state';

test('an existing part opens on its own range, not on the history', () => {
  const current = { surah: 67, from: 1, to: 15 };
  expect(startDraft({ current, last: { surah: 2, from: 1, to: 5 } })).toEqual({
    draft: current,
    afterAyah: null,
  });
});

test('an empty part starts right after the last saved ayah, as long as the last range', () => {
  expect(startDraft({ current: null, last: { surah: 67, from: 1, to: 15 } })).toEqual({
    draft: { surah: 67, from: 16, to: 30 },
    afterAyah: 15,
  });
});

test('no history: nothing picked, and «تمّ» has no range', () => {
  const start = startDraft({ current: null, last: null });
  expect(start).toEqual({ draft: { surah: null, from: 1, to: 1 }, afterAyah: null });
  expect(rangeOf(start.draft)).toBeNull();
  expect(setBound(start.draft, { end: 'to', value: 5 })).toBe(start.draft);
});

test('picking a surah takes all of it; picking it again keeps the range', () => {
  const d = pickSurah({ surah: null, from: 1, to: 1 }, 68);
  expect(d).toEqual({ surah: 68, from: 1, to: 52 });
  const narrowed = setBound(d, { end: 'to', value: 20 });
  expect(pickSurah(narrowed, 68)).toBe(narrowed);
});

test('the ends clamp to 1…ayah count and keep from ≤ to', () => {
  const d = { surah: 67, from: 16, to: 22 };
  expect(setBound(d, { end: 'from', value: 0 })).toEqual({ surah: 67, from: 1, to: 22 });
  expect(setBound(d, { end: 'to', value: 99 })).toEqual({ surah: 67, from: 16, to: 30 });
  expect(setBound(d, { end: 'from', value: 25 })).toEqual({ surah: 67, from: 25, to: 25 });
  expect(setBound(d, { end: 'to', value: 10 })).toEqual({ surah: 67, from: 10, to: 10 });
  expect(setBound(d, { end: 'to', value: Number.NaN })).toBe(d);
  expect(rangeOf(d)).toEqual({ surah: 67, from: 16, to: 22 });
});

describe('applyTyped: «تمّ» with digits not yet applied', () => {
  const d = { surah: 68, from: 1, to: 52 };
  it('applies each end like a commit, clamped, keeping from ≤ to; empty or no surah: unchanged', () => {
    expect(applyTyped(d, { to: '20' })).toEqual({ surah: 68, from: 1, to: 20 });
    expect(applyTyped(d, { from: '30', to: '10' })).toEqual({ surah: 68, from: 10, to: 10 });
    expect(applyTyped(d, { to: '999' })).toEqual(d);
    expect(applyTyped(d, { from: '', to: 'x' })).toEqual(d);
    expect(applyTyped({ surah: null, from: 1, to: 1 }, { to: '5' })).toEqual({
      surah: null,
      from: 1,
      to: 1,
    });
  });
});
