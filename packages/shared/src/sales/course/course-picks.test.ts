import { describe, expect, it } from 'vitest';
import { dayTimesFromPicks } from '../../schedule/lessons/series/day-times.js';
import { prefillDays } from './course-follow.js';
import { changeOpensOn, changePicks, changePrefillFrom, dayTimesKeeping, inWeekOrder, sameDays, WEEK_ORDER } from './course-picks.js';

const now = '2026-10-18T06:00:00.000Z';
const days = [
  { weekday: 0, startTimeLocal: '17:00' },
  { weekday: 2, startTimeLocal: '19:30' },
];

describe('WEEK_ORDER', () => {
  it('السبت → الجمعة', () => {
    expect(WEEK_ORDER).toEqual([6, 0, 1, 2, 3, 4, 5]);
    expect(inWeekOrder([{ weekday: 0 }, { weekday: 6 }, { weekday: 5 }]).map((d) => d.weekday)).toEqual([6, 0, 5]);
  });
});

describe('dayTimesKeeping — Cairo DST', () => {
  it('a spring-forward gap keeps 00:30 for the whole course (dayTimesFromPicks would read 01:30)', () => {
    const prefilled = prefillDays({ days: [{ weekday: 5, startTimeLocal: '00:30' }, { weekday: 0, startTimeLocal: '00:30' }], from: '2027-04-30', tz: 'Africa/Cairo', now });
    const picks = prefilled.map((p) => p.at);
    expect(dayTimesFromPicks(picks, 'Africa/Cairo')?.startTimeLocal).toBe('01:30');
    const rule = dayTimesKeeping(picks, 'Africa/Cairo', prefilled);
    expect(rule).toEqual(expect.objectContaining({ startTimeLocal: '00:30', startsOn: '2027-04-30', dayTimes: [] }));
  });
  it('a fall-back repeat (Thursday 23:30, 2026-10-29) keeps 23:30', () => {
    const prefilled = prefillDays({ days: [{ weekday: 4, startTimeLocal: '23:30' }], from: '2026-10-29', tz: 'Africa/Cairo', now });
    expect(dayTimesKeeping(prefilled.map((p) => p.at), 'Africa/Cairo', prefilled)?.startTimeLocal).toBe('23:30');
  });
  it('a pick moved by hand is read from its instant', () => {
    const prefilled = prefillDays({ days, from: '2026-10-25', tz: 'Asia/Riyadh', now });
    const moved = '2026-10-27T15:00:00.000Z'; // Tuesday 18:00 Riyadh
    const rule = dayTimesKeeping([prefilled[0]?.at ?? '', moved], 'Asia/Riyadh', prefilled);
    expect(rule?.dayTimes).toEqual([{ weekday: 2, startTimeLocal: '18:00' }]);
  });
  it('no picks → null', () => {
    expect(dayTimesKeeping([], 'Asia/Riyadh', [])).toBeNull();
  });
});

describe('sameDays — nothing changed yet', () => {
  it('a request body with the same days and times', () => {
    const req = { byday: [0, 2], startTimeLocal: '17:00', dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }] };
    expect(sameDays(req, days)).toBe(true);
    expect(sameDays({ ...req, dayTimes: [] }, days)).toBe(false);
    expect(sameDays({ byday: [0, 2], startTimeLocal: '17:00:00', dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }] }, days)).toBe(true);
  });
});

describe('changePicks / changeOpensOn', () => {
  const course = { days, tz: 'Asia/Riyadh', startsOn: '2026-10-04', opensOn: '2026-10-18', running: true };
  it('a running course: from today', () => {
    const picks = changePicks(course, new Date(now));
    expect(picks.map((p) => p.at)).toEqual(['2026-10-18T14:00:00.000Z', '2026-10-20T16:30:00.000Z']);
  });
  it('a course booked ahead (a renewal): from its own first day', () => {
    const ahead = { ...course, startsOn: '2026-11-16', opensOn: '2026-11-16', running: false };
    expect(changeOpensOn(ahead, new Date(now))).toBe('2026-11-16');
    const picks = changePicks(ahead, new Date(now));
    expect(picks.map((p) => p.at)).toEqual(['2026-11-17T16:30:00.000Z', '2026-11-22T14:00:00.000Z']);
  });
  it('a pending change (latest set from Tue 20 Oct, the old rules still run): changeOpensOn is today, the picks on startsOn', () => {
    const pending = { ...course, startsOn: '2026-10-20' };
    expect(changeOpensOn(pending, new Date(now))).toBe('2026-10-18');
    expect(changePicks(pending, new Date(now)).map((p) => p.at)).toEqual(['2026-10-20T16:30:00.000Z', '2026-10-25T14:00:00.000Z']);
  });
  it('booked ahead + a pending change: changeOpensOn is opensOn, the picks on the new set\'s start', () => {
    // Renewal from Sun 8 Nov on Sun+Tue, Sunday swapped for Monday from Mon 9 Nov: latest set [Mon, Tue].
    const monTue = [{ weekday: 1, startTimeLocal: '17:00' }, { weekday: 2, startTimeLocal: '19:30' }];
    const ahead = { ...course, days: monTue, startsOn: '2026-11-09', opensOn: '2026-11-08', running: false };
    expect(changeOpensOn(ahead, new Date(now))).toBe('2026-11-08');
    expect(changePicks(ahead, new Date(now)).map((p) => p.at)).toEqual(['2026-11-09T14:00:00.000Z', '2026-11-10T16:30:00.000Z']);
  });
  it('the unchanged prefill of a pending change is the server\'s no_change (only the latest set runs from its start)', () => {
    const pending = { ...course, startsOn: '2026-10-20' };
    const prefilled = changePicks(pending, new Date(now));
    const rule = dayTimesKeeping(prefilled.map((p) => p.at), pending.tz, prefilled);
    expect(rule?.startsOn).toBe('2026-10-20');
    expect(rule && sameDays(rule, pending.days)).toBe(true);
  });
  it('never before today', () => {
    expect(changeOpensOn({ ...course, opensOn: '2026-10-01', running: false }, new Date(now))).toBe('2026-10-18');
  });
});

describe('changePrefillFrom — the later of changeOpensOn and startsOn', () => {
  const course = { tz: 'Asia/Riyadh', startsOn: '2026-10-04', opensOn: '2026-10-18', running: true };
  it('running: today', () => {
    expect(changePrefillFrom(course, new Date(now))).toBe('2026-10-18');
  });
  it('running + a pending change from Tue 20 Oct: its startsOn', () => {
    expect(changePrefillFrom({ ...course, startsOn: '2026-10-20' }, new Date(now))).toBe('2026-10-20');
  });
  it('booked ahead: its opensOn (= startsOn)', () => {
    expect(changePrefillFrom({ ...course, startsOn: '2026-11-16', opensOn: '2026-11-16', running: false }, new Date(now))).toBe('2026-11-16');
  });
  it('booked ahead + a pending change: the new set\'s startsOn, after opensOn', () => {
    expect(changePrefillFrom({ ...course, startsOn: '2026-11-09', opensOn: '2026-11-08', running: false }, new Date(now))).toBe('2026-11-09');
  });
});
