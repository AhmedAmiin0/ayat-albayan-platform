import { describe, expect, it } from 'vitest';
import { diffRanges, diffSegments } from './highlight-diff.js';

// R-STU-03 duplicate dialog: underline only the letter that differs (docs/07 §14.2).
describe('diffRanges', () => {
  it.each([
    ['سهيلة', 'سهيله', [{ start: 4, end: 5 }]],
    ['سهيله', 'سهيلة', [{ start: 4, end: 5 }]],
    ['أحمد', 'احمد', [{ start: 0, end: 1 }]],
    ['إيمان', 'ايمان', [{ start: 0, end: 1 }]],
    ['آمنة', 'امنه', [{ start: 0, end: 1 }, { start: 3, end: 4 }]],
    ['جودى', 'جودي', [{ start: 3, end: 4 }]],
    ['مؤمن', 'مومن', [{ start: 1, end: 2 }]],
  ])('%s vs %s', (text, other, ranges) => {
    expect(diffRanges(text, other)).toEqual(ranges);
  });

  it('identical names and tashkeel-only differences have no ranges', () => {
    expect(diffRanges('سهيلة محمد', 'سهيلة محمد')).toEqual([]);
    expect(diffRanges('مُحَمَّد', 'محمد')).toEqual([]);
    expect(diffRanges('عبـــدالله', 'عبدالله')).toEqual([]);
  });

  it('marks on a differing letter ride along with it', () => {
    expect(diffRanges('فاطمةُ', 'فاطمه')).toEqual([{ start: 4, end: 6 }]);
  });

  it('extra words are differing runs; spaces are never highlighted', () => {
    expect(diffRanges('جود وسهيله', 'سهيلة')).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 5 },
      { start: 9, end: 10 },
    ]);
  });

  it('merges adjacent differing letters into one range', () => {
    expect(diffRanges('سهيلةة', 'سهيل')).toEqual([{ start: 4, end: 6 }]);
  });
});

describe('diffSegments', () => {
  it('splits the raw name into ordered runs that rejoin to the original', () => {
    const segs = diffSegments('سهيلة محمد', 'سهيله محمد');
    expect(segs).toEqual([
      { text: 'سهيل', diff: false },
      { text: 'ة', diff: true },
      { text: ' محمد', diff: false },
    ]);
    expect(segs.map((s) => s.text).join('')).toBe('سهيلة محمد');
  });

  it('returns one plain run when nothing differs, none for an empty name', () => {
    expect(diffSegments('سهيلة', 'سهيلة')).toEqual([{ text: 'سهيلة', diff: false }]);
    expect(diffSegments('', 'سهيلة')).toEqual([]);
  });
});
