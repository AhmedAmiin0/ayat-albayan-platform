import { describe, expect, it } from 'vitest';
import { freeSlots, type FreeSlotsInput, type WeeklyRow } from './free-slots';

const RIYADH = 'Asia/Riyadh';
const starts = (input: FreeSlotsInput) => freeSlots(input).map((s) => s.start.toISOString());
const row = (weekday: number, range: [string, string]): WeeklyRow => ({
  weekday,
  start_time: range[0],
  end_time: range[1],
  tz: RIYADH,
});
// 2026-10-03 is a Saturday (6), 2026-10-04 a Sunday (0) — the academy week starts on Sunday.
const base: FreeSlotsInput = {
  from: new Date('2026-10-03T00:00:00Z'),
  to: new Date('2026-10-05T00:00:00Z'),
  durationMin: 60,
  availability: [],
  timeOff: [],
  busy: [],
};

describe('freeSlots — week boundaries (R-TCH-02)', () => {
  it('a range crossing السبت → الأحد includes both weekdays', () => {
    const availability = [row(6, ['10:00', '11:00']), row(0, ['10:00', '11:00'])];
    expect(starts({ ...base, availability })).toEqual([
      '2026-10-03T07:00:00.000Z',
      '2026-10-04T07:00:00.000Z',
    ]);
  });

  it('a local Sunday 01:00 slot falls on Saturday in UTC and is still found', () => {
    const from = new Date('2026-10-03T00:00:00Z');
    const to = new Date('2026-10-04T00:00:00Z');
    expect(starts({ ...base, from, to, availability: [row(0, ['01:00', '02:00'])] })).toEqual([
      '2026-10-03T22:00:00.000Z',
    ]);
  });

  it('a range starting mid-week wraps to the next week for earlier weekdays', () => {
    const from = new Date('2026-10-01T00:00:00Z'); // Thursday
    const to = new Date('2026-10-06T00:00:00Z');
    expect(starts({ ...base, from, to, availability: [row(1, ['16:00', '17:00'])] })).toEqual([
      '2026-10-05T13:00:00.000Z',
    ]);
  });

  it('`to` is exclusive but a slot ending exactly on it is kept', () => {
    const to = new Date('2026-10-03T08:00:00Z');
    expect(starts({ ...base, to, availability: [row(6, ['10:00', '12:00'])] })).toEqual([
      '2026-10-03T07:00:00.000Z',
    ]);
  });
});

describe('freeSlots — slots crossing midnight (R-TCH-02)', () => {
  const lateSat = row(6, ['22:00', '24:00']);
  const earlySun = row(0, ['00:00', '02:00']);

  it('22:00–24:00 + 00:00–02:00 on the next day form one window', () => {
    expect(starts({ ...base, availability: [lateSat, earlySun], stepMin: 30 })).toEqual([
      '2026-10-03T19:00:00.000Z',
      '2026-10-03T19:30:00.000Z',
      '2026-10-03T20:00:00.000Z',
      '2026-10-03T20:30:00.000Z', // 23:30–00:30 local, across midnight
      '2026-10-03T21:00:00.000Z',
      '2026-10-03T21:30:00.000Z',
      '2026-10-03T22:00:00.000Z',
    ]);
  });

  it('the 60-min slot across midnight is offered only when both sides are free', () => {
    const busy = [{ start: new Date('2026-10-03T21:00:00Z'), end: new Date('2026-10-03T21:30:00Z') }];
    const got = starts({ ...base, availability: [lateSat, earlySun], stepMin: 30, busy });
    expect(got).not.toContain('2026-10-03T20:30:00.000Z');
    expect(got).toContain('2026-10-03T20:00:00.000Z');
  });

  it('a window ending "23:59" (the UI last option) runs to midnight, so a slot spans it', () => {
    const availability = [row(6, ['23:00', '23:59']), earlySun];
    expect(starts({ ...base, availability, stepMin: 30 })).toEqual([
      '2026-10-03T20:00:00.000Z', // 23:00–00:00
      '2026-10-03T20:30:00.000Z', // 23:30–00:30, across midnight
      '2026-10-03T21:00:00.000Z',
      '2026-10-03T21:30:00.000Z',
      '2026-10-03T22:00:00.000Z',
    ]);
  });

  it('a local early-morning window crosses UTC midnight (Riyadh 01:00–04:00 → 22:00Z–01:00Z)', () => {
    const from = new Date('2026-10-03T00:00:00Z');
    const to = new Date('2026-10-05T00:00:00Z');
    expect(starts({ ...base, from, to, durationMin: 90, availability: [row(0, ['01:00', '04:00'])] })).toEqual([
      '2026-10-03T22:00:00.000Z',
      '2026-10-03T23:30:00.000Z',
    ]);
  });
});
