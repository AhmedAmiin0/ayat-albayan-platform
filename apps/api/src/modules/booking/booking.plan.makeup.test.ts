import { describe, expect, it } from 'vitest';
import { planBooking, type PlanInput } from './booking.plan';

// Sundays + Tuesdays 17:00 Riyadh, 45 min, from Thu 2026-10-01 11:00 Riyadh.
const input = (single: boolean, over: Partial<PlanInput['rule']> = {}): PlanInput => ({
  rule: { byday: [0, 2], startTimeLocal: '17:00', tz: 'Asia/Riyadh', durationMin: 45, startsOn: '2026-10-01', single, ...over },
  now: new Date('2026-10-01T08:00:00Z'),
  horizonWeeks: 5,
});

describe('planBooking — a makeup is one lesson like a trial (R-SCH-10)', () => {
  it('single: only the first occurrence, and the rule ends that local day', () => {
    const plan = planBooking(input(true));
    expect(plan.occurrences.map((o) => o.starts_at.toISOString())).toEqual(['2026-10-04T14:00:00.000Z']);
    expect(plan.timing.ends_on).toBe('2026-10-04');
  });

  it('a package repeats over the horizon and stays open-ended', () => {
    const plan = planBooking(input(false));
    expect(plan.occurrences.length).toBeGreaterThan(5);
    expect(plan.timing.ends_on).toBeNull();
  });

  it('the picked slot pins the lesson; a start outside the horizon leaves nothing to book', () => {
    expect(planBooking(input(true, { startsOn: '2026-12-01' })).occurrences).toEqual([]);
  });
});
