import { describe, expect, it } from 'vitest';
import { addLocalDays, weekdayOfDate, zonedInstant } from './wall.js';

describe('zonedInstant', () => {
  it('Riyadh is UTC+3 all year', () => {
    expect(zonedInstant('2026-10-20', '17:00', 'Asia/Riyadh')).toBe('2026-10-20T14:00:00.000Z');
  });
  it('Cairo before and after its fall-back (last Thursday of October)', () => {
    expect(zonedInstant('2026-10-27', '17:00', 'Africa/Cairo')).toBe('2026-10-27T14:00:00.000Z');
    expect(zonedInstant('2026-11-03', '17:00', 'Africa/Cairo')).toBe('2026-11-03T15:00:00.000Z');
  });
  it('New York across midnight UTC', () => {
    expect(zonedInstant('2026-10-20', '21:30', 'America/New_York')).toBe('2026-10-21T01:30:00.000Z');
  });
});

describe('local days', () => {
  it('addLocalDays crosses months and years', () => {
    expect(addLocalDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addLocalDays('2027-01-01', -1)).toBe('2026-12-31');
  });
  it('weekdayOfDate: 2026-10-18 is a Sunday', () => {
    expect(weekdayOfDate('2026-10-18')).toBe(0);
    expect(weekdayOfDate('2026-10-24')).toBe(6);
  });
});
