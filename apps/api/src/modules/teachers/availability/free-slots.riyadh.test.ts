import { describe, expect, it } from 'vitest';
import { freeSlots, type FreeSlotsInput, type WeeklyRow } from './free-slots';

const starts = (input: FreeSlotsInput) => freeSlots(input).map((s) => s.start.toISOString());
// 2026-07-15 is a Wednesday (weekday 3).
const WED: WeeklyRow = { weekday: 3, start_time: '16:00', end_time: '18:00', tz: 'Asia/Riyadh' };
const base: FreeSlotsInput = {
  from: new Date('2026-07-15T00:00:00Z'),
  to: new Date('2026-07-16T00:00:00Z'),
  durationMin: 60,
  availability: [WED],
  timeOff: [],
  busy: [],
};

describe('freeSlots — Asia/Riyadh UTC+3 (R-TCH-02)', () => {
  it('turns a local 16:00–18:00 window into back-to-back UTC slots', () => {
    const slots = freeSlots(base);
    expect(slots.map((s) => [s.start.toISOString(), s.end.toISOString()])).toEqual([
      ['2026-07-15T13:00:00.000Z', '2026-07-15T14:00:00.000Z'],
      ['2026-07-15T14:00:00.000Z', '2026-07-15T15:00:00.000Z'],
    ]);
  });

  it('accepts Postgres "HH:MM:SS" times', () => {
    const row = { ...WED, start_time: '16:00:00', end_time: '18:00:00' };
    expect(starts({ ...base, availability: [row] })).toHaveLength(2);
  });

  it('steps by stepMin when given', () => {
    expect(starts({ ...base, stepMin: 30 })).toEqual([
      '2026-07-15T13:00:00.000Z',
      '2026-07-15T13:30:00.000Z',
      '2026-07-15T14:00:00.000Z',
    ]);
  });

  it('drops the leftover tail shorter than the duration', () => {
    const row = { ...WED, end_time: '18:30' };
    expect(starts({ ...base, durationMin: 45, availability: [row] })).toEqual([
      '2026-07-15T13:00:00.000Z',
      '2026-07-15T13:45:00.000Z',
      '2026-07-15T14:30:00.000Z',
    ]);
  });

  it('returns nothing when the duration is longer than the window', () => {
    expect(starts({ ...base, durationMin: 90, availability: [{ ...WED, end_time: '17:00' }] })).toEqual([]);
  });

  it('keeps only slots fully inside [from, to]', () => {
    const from = new Date('2026-07-15T13:30:00Z');
    const to = new Date('2026-07-15T15:00:00Z');
    expect(starts({ ...base, from, to, stepMin: 30 })).toEqual([
      '2026-07-15T13:30:00.000Z',
      '2026-07-15T14:00:00.000Z',
    ]);
  });

  it('repeats weekly across a multi-week range', () => {
    const to = new Date('2026-07-30T00:00:00Z');
    expect(starts({ ...base, to, durationMin: 120 })).toEqual([
      '2026-07-15T13:00:00.000Z',
      '2026-07-22T13:00:00.000Z',
      '2026-07-29T13:00:00.000Z',
    ]);
  });

  it('merges overlapping rows on the same day instead of duplicating slots', () => {
    const overlap = { ...WED, start_time: '17:00', end_time: '19:00' };
    expect(starts({ ...base, availability: [WED, overlap] })).toEqual([
      '2026-07-15T13:00:00.000Z',
      '2026-07-15T14:00:00.000Z',
      '2026-07-15T15:00:00.000Z',
    ]);
  });

  it('returns nothing without availability', () => {
    expect(freeSlots({ ...base, availability: [] })).toEqual([]);
  });

  it('rejects a non-positive duration or step', () => {
    expect(() => freeSlots({ ...base, durationMin: 0 })).toThrow(RangeError);
    expect(() => freeSlots({ ...base, stepMin: 0 })).toThrow(RangeError);
  });
});
