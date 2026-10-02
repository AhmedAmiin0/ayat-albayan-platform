import { describe, expect, it } from 'vitest';
import { inWindow, localToday, wallClock, zonedToUtc } from './time.ts';

describe('wallClock', () => {
  it('keeps the sheet wall clock without a zone', () => {
    expect(wallClock(new Date(Date.UTC(2026, 7, 19)))).toBe('2026-08-19');
    expect(wallClock(new Date(Date.UTC(2026, 7, 19, 19, 39, 5)))).toBe('2026-08-19T19:39:05');
    expect(wallClock(new Date(Date.UTC(1899, 11, 30, 17, 30)))).toBe('17:30');
  });
});

describe('zonedToUtc', () => {
  it('Riyadh is UTC+3 all year', () => {
    expect(zonedToUtc({ date: '2026-09-01', time: '17:00', tz: 'Asia/Riyadh' }).toISOString()).toBe(
      '2026-09-01T14:00:00.000Z',
    );
  });
  it('Cairo follows DST (summer +3, winter +2)', () => {
    expect(
      zonedToUtc({ date: '2026-08-01', time: '20:00', tz: 'Africa/Cairo' }).toISOString(),
    ).toBe('2026-08-01T17:00:00.000Z');
    expect(
      zonedToUtc({ date: '2026-12-01', time: '20:00', tz: 'Africa/Cairo' }).toISOString(),
    ).toBe('2026-12-01T18:00:00.000Z');
  });
});

describe('inWindow / localToday', () => {
  it('accepts only ISO days inside the window', () => {
    const w = { from: '2026-08-01', to: '2026-10-02' };
    expect(inWindow({ date: '2026-08-01', ...w })).toBe(true);
    expect(inWindow({ date: '2066-08-11', ...w })).toBe(false);
    expect(inWindow({ date: '1996-09-30', ...w })).toBe(false);
    expect(inWindow({ date: '8/11/2066', ...w })).toBe(false);
  });
  it('today in the zone, not in UTC', () => {
    const lateUtc = new Date('2026-10-01T22:30:00Z');
    expect(localToday({ now: lateUtc, tz: 'Asia/Riyadh' })).toBe('2026-10-02');
    expect(localToday({ now: lateUtc, tz: 'UTC' })).toBe('2026-10-01');
  });
});
