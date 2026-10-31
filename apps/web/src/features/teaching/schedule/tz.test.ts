import { RIYADH_TZ } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayMonthLabel,
  weekDays,
  weekStart,
  weekWindow,
  weekdayOf,
  zonedParts,
  zonedToUtc,
} from './tz';

const CAIRO = 'Africa/Cairo';

describe('zonedParts (R-SCH-01)', () => {
  it('reads the Riyadh day, time and weekday of a UTC instant', () => {
    expect(zonedParts(new Date('2026-10-04T14:00:00Z'), RIYADH_TZ)).toEqual({
      date: '2026-10-04',
      time: '17:00',
      weekday: 0,
    });
  });

  it('crosses local midnight: 22:30Z is already the next day in Riyadh', () => {
    expect(zonedParts(new Date('2026-10-03T22:30:00Z'), RIYADH_TZ)).toMatchObject({
      date: '2026-10-04',
      time: '01:30',
    });
  });

  it('follows Cairo summer time (UTC+3 in October, UTC+2 in December)', () => {
    expect(zonedParts(new Date('2026-10-04T14:00:00Z'), CAIRO).time).toBe('17:00');
    expect(zonedParts(new Date('2026-12-06T14:00:00Z'), CAIRO).time).toBe('16:00');
  });
});

describe('zonedToUtc', () => {
  it('turns a Riyadh wall clock into its UTC instant', () => {
    expect(zonedToUtc('2026-10-04', '17:00', RIYADH_TZ).toISOString()).toBe('2026-10-04T14:00:00.000Z');
  });

  it('is DST-aware in Cairo', () => {
    expect(zonedToUtc('2026-10-04', '17:00', CAIRO).toISOString()).toBe('2026-10-04T14:00:00.000Z');
    expect(zonedToUtc('2026-12-06', '17:00', CAIRO).toISOString()).toBe('2026-12-06T15:00:00.000Z');
  });

  it('round-trips with zonedParts', () => {
    const at = zonedToUtc('2026-11-01', '00:00', 'America/New_York');
    expect(zonedParts(at, 'America/New_York')).toMatchObject({ date: '2026-11-01', time: '00:00' });
  });
});

describe('calendar weeks (Saturday first, like the availability grid)', () => {
  it('weekdayOf numbers days 0 = الأحد', () => {
    expect(weekdayOf('2026-10-03')).toBe(6);
    expect(weekdayOf('2026-10-04')).toBe(0);
  });

  it('weekStart goes back to the Saturday on or before the date', () => {
    expect(weekStart('2026-10-03')).toBe('2026-10-03');
    expect(weekStart('2026-10-04')).toBe('2026-10-03');
    expect(weekStart('2026-10-09')).toBe('2026-10-03');
    expect(weekStart('2026-10-10')).toBe('2026-10-10');
  });

  it('addDays and weekDays cross month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
    expect(weekDays('2026-10-31')).toEqual([
      '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06',
    ]);
  });

  it('weekWindow is the half-open Riyadh week in UTC', () => {
    const w = weekWindow('2026-10-03', RIYADH_TZ);
    expect(w.from.toISOString()).toBe('2026-10-02T21:00:00.000Z');
    expect(w.to.toISOString()).toBe('2026-10-09T21:00:00.000Z');
  });

  it('dayMonthLabel prints the day with Western digits', () => {
    expect(dayMonthLabel('2026-10-03')).toMatch(/^3 /);
    expect(dayMonthLabel('2026-10-03')).not.toMatch(/[٠-٩]/);
  });
});
