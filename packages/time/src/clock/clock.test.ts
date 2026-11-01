import { describe, expect, it } from 'vitest';
import { clockOfHhmm, clockOfParts } from './clock.js';
import { clockOf } from '../format/index.js';

const UTC = 'UTC';

describe('clockOfHhmm', () => {
  it.each([
    ['09:05', '24', 'ar', '09:05'],
    ['09:05', '24', 'en', '09:05'],
    ['09:05', '12', 'ar', '9:05 ص'],
    ['09:05', '12', 'en', '9:05 AM'],
    ['17:30', '24', 'ar', '17:30'],
    ['17:30', '12', 'ar', '5:30 م'],
    ['17:30', '12', 'en', '5:30 PM'],
    ['00:00', '12', 'ar', '12:00 ص'],
    ['00:00', '12', 'en', '12:00 AM'],
    ['00:00', '24', 'en', '00:00'],
    ['12:00', '12', 'ar', '12:00 م'],
    ['12:00', '12', 'en', '12:00 PM'],
    ['23:59:00', '12', 'en', '11:59 PM'],
  ] as const)('%s in %s h (%s) → %s', (...[hhmm, cycle, locale, out]) => {
    expect(clockOfHhmm(hhmm, cycle, locale)).toBe(out);
  });

  it('returns anything that is not a clock unchanged', () => {
    expect(clockOfHhmm('', '12', 'ar')).toBe('');
    expect(clockOfHhmm('soon', '24', 'en')).toBe('soon');
  });
});

describe('clockOf', () => {
  it('reads the instant in its zone (Riyadh is UTC+3)', () => {
    const at = new Date('2026-10-01T14:30:00Z');
    expect(clockOf(at, { tz: 'Asia/Riyadh', cycle: '24', locale: 'ar' })).toBe('17:30');
    expect(clockOf(at, { tz: 'Asia/Riyadh', cycle: '12', locale: 'ar' })).toBe('5:30 م');
    expect(clockOf(at, { tz: UTC, cycle: '12', locale: 'en' })).toBe('2:30 PM');
  });

  it('midnight and noon', () => {
    expect(clockOf(new Date('2026-10-01T00:00:00Z'), { tz: UTC, cycle: '12', locale: 'en' })).toBe('12:00 AM');
    expect(clockOf(new Date('2026-10-01T00:00:00Z'), { tz: UTC, cycle: '24', locale: 'ar' })).toBe('00:00');
    expect(clockOf(new Date('2026-10-01T12:00:00Z'), { tz: UTC, cycle: '12', locale: 'ar' })).toBe('12:00 م');
  });

  it('09:05 in both cycles', () => {
    const at = new Date('2026-10-01T09:05:00Z');
    expect(clockOf(at, { tz: UTC, cycle: '24', locale: 'en' })).toBe('09:05');
    expect(clockOf(at, { tz: UTC, cycle: '12', locale: 'ar' })).toBe('9:05 ص');
  });
});

describe('clockOfParts', () => {
  it('wraps hours outside 0–23', () => {
    expect(clockOfParts(24, 0, { cycle: '24', locale: 'en' })).toBe('00:00');
    expect(clockOfParts(-1, 30, { cycle: '12', locale: 'en' })).toBe('11:30 PM');
  });
});
