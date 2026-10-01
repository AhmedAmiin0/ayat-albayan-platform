import { describe, expect, it } from 'vitest';
import { freeSlots, type FreeSlotsInput, type WeeklyRow } from './free-slots';

const CAIRO = 'Africa/Cairo';
const starts = (input: FreeSlotsInput) => freeSlots(input).map((s) => s.start.toISOString());
const input = (row: WeeklyRow, range: [string, string]): FreeSlotsInput => ({
  from: new Date(range[0]),
  to: new Date(range[1]),
  durationMin: 60,
  availability: [row],
  timeOff: [],
  busy: [],
});
const WED_16 = { weekday: 3, start_time: '16:00', end_time: '17:00', tz: CAIRO };

describe('freeSlots — Africa/Cairo with DST (R-TCH-02, R-SCH-01)', () => {
  it('summer (2026-07-15): Cairo 16:00 is 13:00Z (UTC+3)', () => {
    expect(starts(input(WED_16, ['2026-07-15T00:00:00Z', '2026-07-16T00:00:00Z']))).toEqual([
      '2026-07-15T13:00:00.000Z',
    ]);
  });

  it('winter (2026-01-14): Cairo 16:00 is 14:00Z (UTC+2)', () => {
    expect(starts(input(WED_16, ['2026-01-14T00:00:00Z', '2026-01-15T00:00:00Z']))).toEqual([
      '2026-01-14T14:00:00.000Z',
    ]);
  });

  it('a weekly slot keeps its wall-clock across the October fall-back', () => {
    const sun = { ...WED_16, weekday: 0 };
    expect(starts(input(sun, ['2026-10-25T00:00:00Z', '2026-11-02T00:00:00Z']))).toEqual([
      '2026-10-25T13:00:00.000Z',
      '2026-11-01T14:00:00.000Z',
    ]);
  });

  it('a weekly slot keeps its wall-clock across the April spring-forward', () => {
    const fri = { ...WED_16, weekday: 5 };
    expect(starts(input(fri, ['2026-04-17T00:00:00Z', '2026-04-25T00:00:00Z']))).toEqual([
      '2026-04-17T14:00:00.000Z',
      '2026-04-24T13:00:00.000Z',
    ]);
  });

  it('Riyadh stays UTC+3 in winter while Cairo moves to UTC+2', () => {
    const riyadh = { ...WED_16, tz: 'Asia/Riyadh' };
    expect(starts(input(riyadh, ['2026-01-14T00:00:00Z', '2026-01-15T00:00:00Z']))).toEqual([
      '2026-01-14T13:00:00.000Z',
    ]);
  });

  describe('transition days never yield broken or duplicate slots', () => {
    const sane = (slots: ReturnType<typeof freeSlots>) => {
      const keys = slots.map((s) => s.start.toISOString());
      expect(new Set(keys).size).toBe(keys.length);
      for (const s of slots) expect(s.end.getTime() - s.start.getTime()).toBe(3_600_000);
    };

    it('2026-04-24 (Fri): local 00:00–01:00 does not exist', () => {
      const fri = { weekday: 5, start_time: '00:00', end_time: '03:00', tz: CAIRO };
      const slots = freeSlots(input(fri, ['2026-04-23T00:00:00Z', '2026-04-25T00:00:00Z']));
      sane(slots);
      // 00:00 shifts to 01:00 (+3) = 22:00Z; 03:00 (+3) = 00:00Z → two real hours.
      expect(slots.map((s) => s.start.toISOString())).toEqual([
        '2026-04-23T22:00:00.000Z',
        '2026-04-23T23:00:00.000Z',
      ]);
    });

    it('2026-04-24 (Fri): a window entirely inside the gap is empty', () => {
      const gap = { weekday: 5, start_time: '00:00', end_time: '01:00', tz: CAIRO };
      expect(freeSlots(input(gap, ['2026-04-23T00:00:00Z', '2026-04-25T00:00:00Z']))).toEqual([]);
    });

    it('2026-10-29 (Thu): local 23:00–24:00 happens twice', () => {
      const thu = { weekday: 4, start_time: '21:00', end_time: '23:30', tz: CAIRO };
      const slots = freeSlots(input(thu, ['2026-10-29T00:00:00Z', '2026-10-30T00:00:00Z']));
      sane(slots);
      // 21:00 (+3) = 18:00Z; 23:30 resolves to the later instant (+2) = 21:30Z.
      expect(slots.map((s) => s.start.toISOString())).toEqual([
        '2026-10-29T18:00:00.000Z',
        '2026-10-29T19:00:00.000Z',
        '2026-10-29T20:00:00.000Z',
      ]);
    });
  });
});
