import { describe, expect, it } from 'vitest';
import { defaultPeriod, parseDashboardSearch, periodOf, rangeError, riyadhToday, thisWeek } from './search';

describe('parseDashboardSearch', () => {
  it('keeps valid days and a known queue tab, drops the rest', () => {
    expect(parseDashboardSearch({ from: '2026-05-01', to: '2026-10-02', work: 'unpaid' })).toEqual({
      from: '2026-05-01',
      to: '2026-10-02',
      work: 'unpaid',
    });
    expect(parseDashboardSearch({ from: '2026-5-1', to: 'x', work: 'payouts' })).toEqual({});
  });
});

describe('ranges', () => {
  it('today is the Riyadh day (21:30 UTC is already tomorrow there)', () => {
    expect(riyadhToday(new Date('2026-10-01T21:30:00Z'))).toBe('2026-10-02');
  });

  it('the default period is six months to today, across a year end', () => {
    expect(defaultPeriod('2026-10-02')).toEqual({ from: '2026-05-01', to: '2026-10-02' });
    expect(defaultPeriod('2026-02-14')).toEqual({ from: '2025-09-01', to: '2026-02-14' });
  });

  it('the URL overrides either end', () => {
    expect(periodOf({ from: '2026-09-01' }, '2026-10-02')).toEqual({ from: '2026-09-01', to: '2026-10-02' });
  });

  it('this week runs Saturday to Friday', () => {
    expect(thisWeek('2026-10-02')).toEqual({ from: '2026-09-26', to: '2026-10-02' });
    expect(thisWeek('2026-10-03')).toEqual({ from: '2026-10-03', to: '2026-10-09' });
  });

  it('rangeError mirrors the API codes', () => {
    expect(rangeError({ from: '2026-09-01', to: '2026-10-02' })).toBeNull();
    expect(rangeError({ from: '2026-10-02', to: '2026-09-01' })).toBe('invalid_range');
    expect(rangeError({ from: '2024-01-01', to: '2026-10-02' })).toBe('range_too_large');
  });
});
