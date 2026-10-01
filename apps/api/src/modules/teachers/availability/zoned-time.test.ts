import { describe, expect, it } from 'vitest';
import { localDay, offsetMs, toMinutes, weekdayOf, zonedToUtc } from './zoned-time';

const H = 3_600_000;
const at = (iso: string) => Date.parse(iso);
const day = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`);
const iso = (ms: number) => new Date(ms).toISOString();

describe('zoned-time (R-SCH-01, R-TCH-02)', () => {
  it('Asia/Riyadh is UTC+3 all year (no DST)', () => {
    expect(offsetMs(at('2026-01-14T12:00:00Z'), 'Asia/Riyadh')).toBe(3 * H);
    expect(offsetMs(at('2026-07-15T12:00:00Z'), 'Asia/Riyadh')).toBe(3 * H);
  });

  it('Africa/Cairo is UTC+3 in summer and UTC+2 in winter (DST since 2023)', () => {
    expect(offsetMs(at('2026-07-15T12:00:00Z'), 'Africa/Cairo')).toBe(3 * H);
    expect(offsetMs(at('2026-01-14T12:00:00Z'), 'Africa/Cairo')).toBe(2 * H);
  });

  it('converts wall-clock to UTC in each zone', () => {
    expect(iso(zonedToUtc(day('2026-07-15'), 16 * 60, 'Asia/Riyadh'))).toBe('2026-07-15T13:00:00.000Z');
    expect(iso(zonedToUtc(day('2026-07-15'), 16 * 60, 'Africa/Cairo'))).toBe('2026-07-15T13:00:00.000Z');
    expect(iso(zonedToUtc(day('2026-01-14'), 16 * 60, 'Africa/Cairo'))).toBe('2026-01-14T14:00:00.000Z');
  });

  it('local midnight in Riyadh is the previous UTC day', () => {
    expect(iso(zonedToUtc(day('2026-10-04'), 0, 'Asia/Riyadh'))).toBe('2026-10-03T21:00:00.000Z');
  });

  it('"24:00" is the next local midnight', () => {
    expect(zonedToUtc(day('2026-10-03'), 1440, 'Asia/Riyadh')).toBe(
      zonedToUtc(day('2026-10-04'), 0, 'Asia/Riyadh'),
    );
  });

  it('a non-existent Cairo wall time (spring-forward gap) shifts forward', () => {
    // 2026-04-24 00:00 → 01:00 local; 00:30 does not exist and lands on 01:30 (+3).
    expect(iso(zonedToUtc(day('2026-04-24'), 30, 'Africa/Cairo'))).toBe('2026-04-23T22:30:00.000Z');
  });

  it('a repeated Cairo wall time (fall-back) resolves to the later instant', () => {
    // 2026-10-29 24:00 → 23:00 local; 23:30 happens at 20:30Z and 21:30Z.
    expect(iso(zonedToUtc(day('2026-10-29'), 23 * 60 + 30, 'Africa/Cairo'))).toBe(
      '2026-10-29T21:30:00.000Z',
    );
  });

  it('localDay uses the zone calendar, not UTC', () => {
    expect(iso(localDay(at('2026-07-14T22:30:00Z'), 'Asia/Riyadh'))).toBe('2026-07-15T00:00:00.000Z');
    expect(iso(localDay(at('2026-07-14T22:30:00Z'), 'UTC'))).toBe('2026-07-14T00:00:00.000Z');
  });

  it('weekdayOf: 0 = الأحد … 6 = السبت', () => {
    expect(weekdayOf(day('2026-10-04'))).toBe(0);
    expect(weekdayOf(day('2026-10-03'))).toBe(6);
  });

  it.each([
    ['16:30', 990],
    ['16:30:00', 990],
    ['00:00', 0],
    ['24:00:00', 1440],
  ])('toMinutes(%s) = %i', (time, minutes) => {
    expect(toMinutes(time)).toBe(minutes);
  });
});
