import { describe, expect, it } from 'vitest';
import { monthShift, monthsOf, parseRange, rangeWindow, riyadhDate, riyadhMonth } from './range';

const body = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as { getResponse: () => unknown }).getResponse();
  }
  return null;
};

describe('parseRange (docs/11 §3)', () => {
  it('accepts inclusive local days', () => {
    expect(parseRange({ from: '2026-09-01', to: '2026-09-30' })).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('a reversed range is 400 invalid_range, more than a year 400 range_too_large', () => {
    expect(body(() => parseRange({ from: '2026-09-30', to: '2026-09-01' }))).toMatchObject({ code: 'invalid_range' });
    expect(body(() => parseRange({ from: '2025-01-01', to: '2026-09-01' }))).toMatchObject({ code: 'range_too_large' });
  });

  it('a missing or malformed day is the plain validation_failed', () => {
    expect(body(() => parseRange({ from: '2026-9-1' }))).toMatchObject({ message: 'validation_failed' });
  });
});

describe('rangeWindow', () => {
  it('is Riyadh midnight to the midnight after `to` (UTC+3, no DST)', () => {
    const w = rangeWindow({ from: '2026-10-01', to: '2026-10-07' });
    expect(w.from.toISOString()).toBe('2026-09-30T21:00:00.000Z');
    expect(w.to.toISOString()).toBe('2026-10-07T21:00:00.000Z');
  });
});

describe('riyadhDate / riyadhMonth', () => {
  it('an instant late on the 30th UTC is already the 1st in Riyadh', () => {
    expect(riyadhDate('2026-09-30T21:30:00.000Z')).toBe('2026-10-01');
    expect(riyadhMonth('2026-09-30T21:30:00.000Z')).toBe('2026-10');
    expect(riyadhMonth('2026-09-30T20:59:00.000Z')).toBe('2026-09');
  });
});

describe('monthsOf', () => {
  it('lists every touched month across a year end', () => {
    expect(monthsOf({ from: '2025-11-15', to: '2026-02-03' })).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('one month for a range inside it', () => {
    expect(monthsOf({ from: '2026-10-01', to: '2026-10-02' })).toEqual(['2026-10']);
  });
});

describe('monthShift', () => {
  it('moves across year ends', () => {
    expect(monthShift('2026-01', -1)).toBe('2025-12-01');
    expect(monthShift('2026-12', 1)).toBe('2027-01-01');
    expect(monthShift('2026-10', 0)).toBe('2026-10-01');
  });
});
