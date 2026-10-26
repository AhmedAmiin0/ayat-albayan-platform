import { describe, expect, it } from 'vitest';
import { freeSlots, type FreeSlotsInput, type TimeRange } from './free-slots';

const starts = (input: FreeSlotsInput) => freeSlots(input).map((s) => s.start.toISOString());
const range = (start: string, end: string): TimeRange => ({ start: new Date(start), end: new Date(end) });
// Wednesday 2026-07-15, Cairo summer (UTC+3): 16:00–20:00 local = 13:00Z–17:00Z.
const base: FreeSlotsInput = {
  from: new Date('2026-07-15T00:00:00Z'),
  to: new Date('2026-07-23T00:00:00Z'),
  durationMin: 60,
  availability: [{ weekday: 3, start_time: '16:00', end_time: '20:00', tz: 'Africa/Cairo' }],
  timeOff: [],
  busy: [],
};
const ALL = [
  '2026-07-15T13:00:00.000Z',
  '2026-07-15T14:00:00.000Z',
  '2026-07-15T15:00:00.000Z',
  '2026-07-15T16:00:00.000Z',
  '2026-07-22T13:00:00.000Z',
  '2026-07-22T14:00:00.000Z',
  '2026-07-22T15:00:00.000Z',
  '2026-07-22T16:00:00.000Z',
];

describe('freeSlots — time-off and busy intervals (R-TCH-02, R-SCH-04)', () => {
  it('without blockers every slot of both weeks is free', () => {
    expect(starts(base)).toEqual(ALL);
  });

  it('a whole-day time-off removes that day only', () => {
    const timeOff = [range('2026-07-14T21:00:00Z', '2026-07-15T21:00:00Z')];
    expect(starts({ ...base, timeOff })).toEqual(ALL.slice(4));
  });

  it('a multi-day time-off spanning the week boundary removes both weeks', () => {
    const timeOff = [range('2026-07-15T00:00:00Z', '2026-07-23T00:00:00Z')];
    expect(starts({ ...base, timeOff })).toEqual([]);
  });

  it('a partial time-off splits the window and slots restart at its end', () => {
    const timeOff = [range('2026-07-15T14:00:00Z', '2026-07-15T14:30:00Z')];
    expect(starts({ ...base, timeOff }).slice(0, 3)).toEqual([
      '2026-07-15T13:00:00.000Z',
      '2026-07-15T14:30:00.000Z',
      '2026-07-15T15:30:00.000Z',
    ]);
  });

  it('overlapping time-offs are treated as their union', () => {
    const timeOff = [
      range('2026-07-15T13:30:00Z', '2026-07-15T15:00:00Z'),
      range('2026-07-15T14:30:00Z', '2026-07-15T16:00:00Z'),
    ];
    expect(starts({ ...base, timeOff }).slice(0, 2)).toEqual([
      '2026-07-15T16:00:00.000Z',
      '2026-07-22T13:00:00.000Z',
    ]);
  });

  it('a time-off touching the window edge removes nothing', () => {
    const timeOff = [range('2026-07-15T12:00:00Z', '2026-07-15T13:00:00Z')];
    expect(starts({ ...base, timeOff })).toEqual(ALL);
  });

  it('busy lessons and time-off are both subtracted', () => {
    const timeOff = [range('2026-07-15T13:00:00Z', '2026-07-15T14:00:00Z')];
    const busy = [range('2026-07-15T15:00:00Z', '2026-07-15T15:45:00Z')];
    expect(starts({ ...base, timeOff, busy }).slice(0, 2)).toEqual([
      '2026-07-15T14:00:00.000Z',
      '2026-07-15T15:45:00.000Z',
    ]);
  });

  it('blockers outside the range change nothing', () => {
    const busy = [range('2026-06-01T00:00:00Z', '2026-06-30T00:00:00Z')];
    expect(starts({ ...base, busy })).toEqual(ALL);
  });
});
