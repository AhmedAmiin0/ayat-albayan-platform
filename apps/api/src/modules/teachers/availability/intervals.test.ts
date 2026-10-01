import { describe, expect, it } from 'vitest';
import { mergeIntervals, subtractIntervals } from './intervals';

const i = (start: number, end: number) => ({ start, end });

describe('mergeIntervals (R-TCH-02)', () => {
  it('sorts and unions overlapping intervals', () => {
    expect(mergeIntervals([i(5, 8), i(1, 3), i(2, 4)])).toEqual([i(1, 4), i(5, 8)]);
  });

  it('joins touching intervals', () => {
    expect(mergeIntervals([i(1, 3), i(3, 5)])).toEqual([i(1, 5)]);
  });

  it('keeps a contained interval inside its parent', () => {
    expect(mergeIntervals([i(1, 10), i(2, 3)])).toEqual([i(1, 10)]);
  });

  it('drops empty and inverted intervals', () => {
    expect(mergeIntervals([i(4, 4), i(6, 5)])).toEqual([]);
  });

  it('does not mutate its input', () => {
    const input = [i(1, 3), i(2, 5)];
    mergeIntervals(input);
    expect(input).toEqual([i(1, 3), i(2, 5)]);
  });
});

describe('subtractIntervals (R-TCH-02)', () => {
  it('splits around a cut in the middle', () => {
    expect(subtractIntervals([i(0, 10)], [i(4, 6)])).toEqual([i(0, 4), i(6, 10)]);
  });

  it('trims cuts that overlap either edge', () => {
    expect(subtractIntervals([i(0, 10)], [i(-5, 2), i(8, 20)])).toEqual([i(2, 8)]);
  });

  it('handles overlapping cuts as one', () => {
    expect(subtractIntervals([i(0, 10)], [i(2, 5), i(4, 7)])).toEqual([i(0, 2), i(7, 10)]);
  });

  it('removes a base fully covered by a cut', () => {
    expect(subtractIntervals([i(2, 4)], [i(0, 10)])).toEqual([]);
  });

  it('ignores cuts that only touch the base', () => {
    expect(subtractIntervals([i(2, 4)], [i(0, 2), i(4, 6)])).toEqual([i(2, 4)]);
  });

  it('applies the same cut to several bases', () => {
    expect(subtractIntervals([i(0, 4), i(6, 10)], [i(3, 7)])).toEqual([i(0, 3), i(7, 10)]);
  });
});
