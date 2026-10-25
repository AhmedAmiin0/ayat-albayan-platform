import { describe, expect, it } from 'vitest';
import { horizonWindow, planBooking, type PlanInput, type PlanRule } from './booking.plan';

// Thu 2026-10-01 11:00 Riyadh. Sundays ahead: Oct 4, 11, 18, 25, Nov 1 (5-week horizon ends Nov 5).
const now = new Date('2026-10-01T08:00:00Z');
const rule: PlanRule = {
  byday: [0, 2],
  startTimeLocal: '17:00',
  tz: 'Asia/Riyadh',
  durationMin: 45,
  startsOn: '2026-10-01',
  single: false,
};
const input = (over: Partial<PlanRule> = {}, horizonWeeks = 5): PlanInput => ({
  rule: { ...rule, ...over },
  now,
  horizonWeeks,
});
const starts = (i: PlanInput) => planBooking(i).occurrences.map((o) => o.starts_at.toISOString());

describe('horizonWindow (R-SCH-02, docs/10 §3)', () => {
  it('starts now when startsOn is today or past, ends now + weeks', () => {
    expect(horizonWindow(input({ startsOn: '2026-09-01' }))).toEqual({
      from: now,
      to: new Date('2026-11-05T08:00:00Z'),
    });
  });

  it('starts at local midnight of a future startsOn in the rule tz', () => {
    expect(horizonWindow(input({ startsOn: '2026-10-10' })).from).toEqual(
      new Date('2026-10-09T21:00:00Z'),
    );
  });
});

describe('planBooking — paid packages (R-SCH-02, R-SCH-06)', () => {
  it('generates every occurrence of the horizon, open-ended', () => {
    const plan = planBooking(input());
    expect(plan.occurrences).toHaveLength(10); // Sun + Tue × 5 weeks
    expect(plan.timing).toMatchObject({ start_time_local: '17:00', ends_on: null, byday: [0, 2] });
    expect(plan.occurrences[0]).toEqual({
      starts_at: new Date('2026-10-04T14:00:00Z'),
      ends_at: new Date('2026-10-04T14:45:00Z'),
    });
  });

  it("skips today's slot once it has passed", () => {
    // Thursday 10:00 Riyadh already passed at 11:00 → the first is next Thursday.
    expect(starts(input({ byday: [4], startTimeLocal: '10:00' }))[0]).toBe('2026-10-08T07:00:00.000Z');
  });

  it('returns nothing when startsOn is beyond the horizon', () => {
    expect(planBooking(input({ startsOn: '2026-12-01' })).occurrences).toEqual([]);
  });
});

describe('planBooking — trial (docs/10 invariant 4)', () => {
  it('is exactly the first occurrence, and the rule ends that local day', () => {
    const plan = planBooking(input({ single: true }));
    expect(plan.occurrences.map((o) => o.starts_at.toISOString())).toEqual(['2026-10-04T14:00:00.000Z']);
    expect(plan.timing.ends_on).toBe('2026-10-04');
  });

  it('ends_on is the local date even when the UTC date is the day before', () => {
    // Sunday 01:00 Riyadh = Saturday 22:00Z.
    const plan = planBooking(input({ single: true, byday: [0], startTimeLocal: '01:00' }));
    expect(plan.occurrences[0]?.starts_at.toISOString()).toBe('2026-10-03T22:00:00.000Z');
    expect(plan.timing.ends_on).toBe('2026-10-04');
  });

  it('a trial with nothing in the horizon stays empty', () => {
    const plan = planBooking(input({ single: true, startsOn: '2026-12-01' }));
    expect(plan).toMatchObject({ occurrences: [], timing: { ends_on: null } });
  });
});
