import { describe, expect, it } from 'vitest';
import { compareValues, matchesFilter, nextSortDir } from './client-sort';

const sorted = (values: unknown[]) => [...values].sort(compareValues);

describe('compareValues', () => {
  it('orders Arabic names alphabetically', () => {
    expect(sorted(['هدى', 'أحمد', 'بلال'])).toEqual(['أحمد', 'بلال', 'هدى']);
  });

  it('orders numbers numerically, digits in text naturally', () => {
    expect(sorted([10, 9, 100])).toEqual([9, 10, 100]);
    expect(sorted(['AB-10', 'AB-9'])).toEqual(['AB-9', 'AB-10']);
  });

  it('orders dates and booleans', () => {
    const a = new Date('2026-01-01');
    const b = new Date('2026-02-01');
    expect(sorted([b, a])).toEqual([a, b]);
    expect(sorted([true, false])).toEqual([false, true]);
  });

  it('puts empty values last', () => {
    expect(sorted([null, 'ب', '', 'أ'])).toEqual(['أ', 'ب', null, '']);
    expect(compareValues(undefined, 'أ')).toBeGreaterThan(0);
    expect(compareValues(null, null)).toBe(0);
  });
});

describe('matchesFilter', () => {
  it('an empty query matches everything', () => {
    expect(matchesFilter(null, '')).toBe(true);
  });

  it('text: contains, ignoring case, tashkeel and hamza/taa marbuta forms', () => {
    expect(matchesFilter('فاطمة الزهراء', 'فاطمه')).toBe(true);
    expect(matchesFilter('أحمد', 'احمد')).toBe(true);
    expect(matchesFilter('مُحَمَّد', 'محمد')).toBe(true);
    expect(matchesFilter('Basic Plan', 'basic')).toBe(true);
    expect(matchesFilter('سهيلة', 'جود')).toBe(false);
    expect(matchesFilter(null, 'x')).toBe(false);
  });

  it('select: exact match on the string form', () => {
    expect(matchesFilter(45, '45', 'select')).toBe(true);
    expect(matchesFilter(450, '45', 'select')).toBe(false);
    expect(matchesFilter('active', 'act', 'select')).toBe(false);
  });
});

describe('nextSortDir', () => {
  it('cycles none → asc → desc → none', () => {
    expect(nextSortDir(false)).toBe('asc');
    expect(nextSortDir('asc')).toBe('desc');
    expect(nextSortDir('desc')).toBe(false);
  });
});
