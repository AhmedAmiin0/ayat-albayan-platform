import { describe, expect, it } from 'vitest';
import { planBooking, type PlanRule } from './booking.plan';

// Cairo falls back at the end of Thu 29 Oct 2026: 23:00–23:59 happens twice, first at UTC+3
// (23:30 = 20:30Z) then at UTC+2 (23:30 = 21:30Z). dayWallToUtc resolves to the later one.
const now = new Date('2026-10-20T08:00:00Z');
const rule: PlanRule = {
  byday: [4],
  startTimeLocal: '23:30',
  tz: 'Africa/Cairo',
  durationMin: 45,
  startsOn: '2026-10-29',
  single: false,
};
const first = (over: Partial<PlanRule>) =>
  planBooking({ rule: { ...rule, ...over }, now, horizonWeeks: 5 }).occurrences[0];

describe('planBooking — the picked slot pins an ambiguous first lesson (DST fall-back)', () => {
  it('without startsAt the repeated wall time resolves to the later instant', () => {
    expect(first({})?.starts_at.toISOString()).toBe('2026-10-29T21:30:00.000Z');
  });

  it('the first instance the admin clicked is kept, with the same length', () => {
    const lesson = first({ startsAt: '2026-10-29T20:30:00.000Z' });
    expect(lesson?.starts_at.toISOString()).toBe('2026-10-29T20:30:00.000Z');
    expect(lesson?.ends_at.toISOString()).toBe('2026-10-29T21:15:00.000Z');
  });

  it('a startsAt at another wall time is ignored (the rule decides)', () => {
    expect(first({ startsAt: '2026-10-29T19:00:00.000Z' })?.starts_at.toISOString()).toBe('2026-10-29T21:30:00.000Z');
  });
});
