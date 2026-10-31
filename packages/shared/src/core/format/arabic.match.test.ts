import { describe, expect, it } from 'vitest';
import { matchesQuery } from './arabic.js';

describe('matchesQuery', () => {
  it('matches everything on a blank search', () => {
    expect(matchesQuery('سهيلة', '')).toBe(true);
    expect(matchesQuery([], '   ')).toBe(true);
  });

  it('ignores letter forms, tashkeel and case', () => {
    expect(matchesQuery('فاطمة الزَّهراء', 'فاطمه')).toBe(true);
    expect(matchesQuery('أبرار', 'ابرار')).toBe(true);
    expect(matchesQuery('Ahmed Amin', ' AMIN ')).toBe(true);
  });

  it('matches when any field contains the search', () => {
    expect(matchesQuery(['محمد', 'AB-0012'], 'ab-00')).toBe(true);
    expect(matchesQuery(['محمد', ''], 'علي')).toBe(false);
  });

  it('does not match across fields', () => {
    expect(matchesQuery(['محمد', 'علي'], 'محمد علي')).toBe(false);
    expect(matchesQuery('محمد علي', 'محمد علي')).toBe(true);
  });
});
