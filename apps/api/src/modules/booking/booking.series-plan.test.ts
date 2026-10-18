import { courseEndsOn, timeGroups } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { planSeries, type SeriesRule } from './booking.series-plan';

/** Thu 2026-10-01 11:00 Riyadh, 5-week horizon as seeded. */
const now = new Date('2026-10-01T08:00:00Z');
const rule: SeriesRule = {
  byday: [0, 2],
  startTimeLocal: '17:00',
  dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }],
  tz: 'Asia/Riyadh',
  durationMin: 45,
  startsOn: '2026-10-01',
  single: false,
};
const plan = (over: Partial<SeriesRule> = {}, endsOn?: string) => planSeries({ rule: { ...rule, ...over }, now, horizonWeeks: 5, endsOn });
const starts = (p: { occurrences: { starts_at: Date }[] }) => p.occurrences.map((o) => o.starts_at.toISOString());
const code = (fn: () => unknown): string | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof HttpException ? (e.getResponse() as { code: string }).code : 'other';
  }
};

describe('planSeries — one plan per start time (owner 2026-10-18, R-SCH-02)', () => {
  it('Sun 17:00 + Tue 19:30: two open-ended plans, each with its own days and time', () => {
    const plans = plan();
    expect(plans.map((p) => [p.timing.start_time_local, p.timing.byday, p.timing.ends_on])).toEqual([
      ['17:00', [0], null],
      ['19:30', [2], null],
    ]);
    expect(starts(plans[0] ?? { occurrences: [] })[0]).toBe('2026-10-04T14:00:00.000Z');
    expect(starts(plans[1] ?? { occurrences: [] })[0]).toBe('2026-10-06T16:30:00.000Z');
  });

  it('sorted by the first lesson, not by weekday: from Mon 5 Oct, Tue 17:00 comes before Sun 19:30', () => {
    const plans = plan({ startsOn: '2026-10-05', dayTimes: [{ weekday: 0, startTimeLocal: '19:30' }] });
    expect(plans.map((p) => p.timing.start_time_local)).toEqual(['17:00', '19:30']);
    expect(plans.map((p) => p.timing.starts_on)).toEqual(['2026-10-05', '2026-10-05']);
  });

  it('an old body (no dayTimes) is exactly one plan, as planBooking always made', () => {
    const plans = plan({ dayTimes: undefined });
    expect(plans).toHaveLength(1);
    expect(plans[0]?.timing).toMatchObject({ byday: [0, 2], start_time_local: '17:00', ends_on: null });
  });

  it('a trial or a makeup is one group whatever dayTimes says: one lesson, ending that day', () => {
    const plans = plan({ single: true });
    expect(plans).toHaveLength(1);
    expect(plans[0]?.occurrences).toHaveLength(1);
    expect(plans[0]?.timing).toMatchObject({ byday: [0, 2], start_time_local: '17:00', ends_on: '2026-10-04' });
  });

  it('400 day_times_overlap when a late lesson runs into the next day’s early one', () => {
    const late = { byday: [0, 1], startTimeLocal: '23:30', durationMin: 90 as const, dayTimes: [{ weekday: 1, startTimeLocal: '00:30' }] };
    expect(code(() => plan(late))).toBe('day_times_overlap');
    expect(code(() => plan({ ...late, durationMin: 60 }))).toBeNull();
  });

  it('endsOn caps every rule: exactly the course’s 8 lessons, both rules end that day', () => {
    const endsOn = courseEndsOn({ groups: timeGroups(rule), startsOn: '2026-10-04', lessonsTotal: 8 }) ?? '';
    expect(endsOn).toBe('2026-10-27');
    const plans = plan({}, endsOn);
    expect(plans.flatMap(starts)).toHaveLength(8);
    expect(plans.every((p) => p.timing.ends_on === endsOn)).toBe(true);
    expect(plans.flatMap(starts).every((s) => s < '2026-10-28')).toBe(true);
  });

  it('a course whose picked day has no lesson before endsOn → 400 no_occurrences (never dropped)', () => {
    expect(code(() => plan({}, '2026-10-05'))).toBe('no_occurrences');
    expect(code(() => plan({}, '2026-10-02'))).toBe('no_occurrences');
  });

  it('a course is planned through its last day whatever the horizon: 2-week horizon, 4-week course → all 8', () => {
    const plans = planSeries({ rule, now, horizonWeeks: 2, endsOn: '2026-10-27' });
    expect(plans.flatMap(starts)).toHaveLength(8);
    expect(plans.flatMap(starts).at(-1)).toBe('2026-10-27T16:30:00.000Z');
  });

  it('open-ended: a time with nothing inside the horizon stays, last and with no lessons (the top-up makes them)', () => {
    const fri = { byday: [0, 5], startTimeLocal: '17:00', dayTimes: [{ weekday: 0, startTimeLocal: '19:00' }] };
    const plans = planSeries({ rule: { ...rule, ...fri }, now, horizonWeeks: 2 / 7 });
    expect(plans.map((p) => p.timing.start_time_local)).toEqual(['17:00', '19:00']);
    expect(plans.map((p) => p.occurrences.length)).toEqual([1, 0]);
    expect(plans.every((p) => p.timing.ends_on === null)).toBe(true);
  });
});

describe('planSeries — the picked slot still pins the first rule on a DST fall-back', () => {
  // Cairo falls back at the end of Thu 29 Oct 2026: 23:30 happens at 20:30Z and again at 21:30Z.
  it('Thu 23:30 (picked, first instance) + Fri 18:00: the Thursday rule comes first and keeps 20:30Z', () => {
    const plans = planSeries({
      rule: {
        byday: [4, 5],
        startTimeLocal: '23:30',
        dayTimes: [{ weekday: 5, startTimeLocal: '18:00' }],
        tz: 'Africa/Cairo',
        durationMin: 45,
        startsOn: '2026-10-29',
        startsAt: '2026-10-29T20:30:00.000Z',
        single: false,
      },
      now: new Date('2026-10-20T08:00:00Z'),
      horizonWeeks: 5,
    });
    expect(plans.map((p) => p.timing.start_time_local)).toEqual(['23:30', '18:00']);
    expect(starts(plans[0] ?? { occurrences: [] })[0]).toBe('2026-10-29T20:30:00.000Z');
    expect(starts(plans[1] ?? { occurrences: [] })[0]).toBe('2026-10-30T16:00:00.000Z');
  });
});
