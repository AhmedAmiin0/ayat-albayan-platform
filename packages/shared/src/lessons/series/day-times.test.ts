import { describe, expect, it } from 'vitest';
import { dayTimesFromPicks, timeGroups, togglePick, wallParts } from './day-times.js';

const RIYADH = 'Asia/Riyadh';
// Riyadh is UTC+3 all year: 2026-10-18 is a Sunday.
const SUN_17 = '2026-10-18T14:00:00.000Z';
const TUE_1930 = '2026-10-20T16:30:00.000Z';
const TUE_17 = '2026-10-20T14:00:00.000Z';
const THU_17 = '2026-10-22T14:00:00.000Z';
const NEXT_SUN_17 = '2026-10-25T14:00:00.000Z';

describe('timeGroups: one group (rule) per distinct time', () => {
  it('days sharing a time stay one group', () => {
    expect(timeGroups({ byday: [2, 0], startTimeLocal: '17:00' })).toEqual([{ startTimeLocal: '17:00', byday: [0, 2] }]);
  });
  it('a day with its own time becomes its own group, in weekday order', () => {
    const groups = timeGroups({ byday: [0, 2, 4], startTimeLocal: '17:00', dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }] });
    expect(groups).toEqual([
      { startTimeLocal: '17:00', byday: [0, 4] },
      { startTimeLocal: '19:30', byday: [2] },
    ]);
  });
  it('every day moved off startTimeLocal leaves no empty group', () => {
    const groups = timeGroups({ byday: [1], startTimeLocal: '17:00', dayTimes: [{ weekday: 1, startTimeLocal: '08:00' }] });
    expect(groups).toEqual([{ startTimeLocal: '08:00', byday: [1] }]);
  });
});

describe('wallParts', () => {
  it('reads the family zone', () => {
    expect(wallParts(SUN_17, RIYADH)).toEqual({ date: '2026-10-18', time: '17:00', weekday: 0 });
    expect(wallParts('2026-10-18T22:30:00Z', RIYADH)).toEqual({ date: '2026-10-19', time: '01:30', weekday: 1 });
  });
});

describe('togglePick: one pick per weekday, within 7 days', () => {
  it('adds, sorted by instant', () => {
    const picks = togglePick({ picks: [TUE_1930], slot: SUN_17, tz: RIYADH });
    expect(picks).toEqual([SUN_17, TUE_1930]);
  });
  it('the same slot again removes it', () => {
    expect(togglePick({ picks: [SUN_17, TUE_1930], slot: SUN_17, tz: RIYADH })).toEqual([TUE_1930]);
  });
  it('another slot on a picked weekday replaces that day', () => {
    expect(togglePick({ picks: [SUN_17, TUE_1930], slot: TUE_17, tz: RIYADH })).toEqual([SUN_17, TUE_17]);
  });
  it('a slot a week away drops the picks 7+ days from it (and its own weekday)', () => {
    expect(togglePick({ picks: [SUN_17, THU_17], slot: NEXT_SUN_17, tz: RIYADH })).toEqual([THU_17, NEXT_SUN_17]);
  });
  it('weekdays are the family zone’s, not UTC’s', () => {
    const lateSat = '2026-10-17T21:30:00Z'; // Sun 00:30 in Riyadh
    expect(togglePick({ picks: [lateSat], slot: SUN_17, tz: RIYADH })).toEqual([SUN_17]);
  });
});

describe('dayTimesFromPicks: picks → the booking body', () => {
  it('nothing picked → null', () => expect(dayTimesFromPicks([], RIYADH)).toBeNull());
  it('the earliest pick fixes startsAt / startsOn / startTimeLocal; differing days go to dayTimes', () => {
    expect(dayTimesFromPicks([TUE_1930, SUN_17], RIYADH)).toEqual({
      byday: [0, 2],
      startTimeLocal: '17:00',
      startsOn: '2026-10-18',
      startsAt: SUN_17,
      dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }],
    });
  });
  it('all picks at one time → no dayTimes (the body old clients send)', () => {
    expect(dayTimesFromPicks([SUN_17, TUE_17], RIYADH)?.dayTimes).toEqual([]);
  });
});
