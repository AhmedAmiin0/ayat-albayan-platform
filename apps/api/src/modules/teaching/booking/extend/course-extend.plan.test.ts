import type { CourseLessonFact } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { planExtend, type ExtendRuleRow } from './course-extend.plan';

const MON: ExtendRuleRow = {
  id: 'ra',
  status: 'active',
  tz: 'Asia/Riyadh',
  byday: [1],
  start_time_local: '17:00:00',
  duration_min: 45,
  ends_on: '2026-11-16',
};
const WED: ExtendRuleRow = { ...MON, id: 'rb', byday: [3], start_time_local: '18:30:00' };
const held = (n: number): CourseLessonFact[] =>
  Array.from({ length: n }, () => ({
    status: 'completed' as const,
    chargeable: true,
    makeup: false,
    instant: false,
  }));
// Tue 17 Nov 2026, 09:00 Riyadh.
const NOW = new Date('2026-11-17T06:00:00Z');

describe('planExtend', () => {
  it('2 of 8 left without a date: Wed 18 and Mon 23, each on its own time', () => {
    const facts = { rules: [MON, WED], lessonsTotal: 8, lessons: held(6), now: NOW };
    const plan = planExtend(facts);
    expect(plan?.starts.map((d) => d.toISOString())).toEqual([
      '2026-11-18T15:30:00.000Z',
      '2026-11-23T14:00:00.000Z',
    ]);
    expect(plan).toMatchObject({ ruleIds: ['ra', 'rb'], courseEnd: '2026-11-16' });
    expect(plan?.endsOn).toBe('2026-11-23');
  });

  it('a cancelled lesson gives its place back; a full package books nothing', () => {
    const cancelled: CourseLessonFact = {
      ...{ status: 'cancelled_by_admin', chargeable: false, makeup: false, instant: false },
    };
    const lessons = [...held(7), cancelled];
    const one = planExtend({ rules: [MON], lessonsTotal: 8, lessons, now: NOW });
    expect(one?.starts).toHaveLength(1);
    const none = planExtend({ rules: [MON], lessonsTotal: 8, lessons: held(8), now: NOW });
    expect([none?.starts, none?.endsOn]).toEqual([[], null]);
  });

  it('a course still running starts after its own end; an older replaced rule is not in the set', () => {
    const old = { ...MON, id: 'r0', ends_on: '2026-10-01', status: 'ended' as const };
    const later = { ...MON, ends_on: '2026-11-30' };
    const plan = planExtend({ rules: [old, later], lessonsTotal: 8, lessons: held(7), now: NOW });
    expect(plan?.ruleIds).toEqual(['ra']);
    expect(plan?.endsOn).toBe('2026-12-07');
  });

  it('a paused set says so; no capped rule is null', () => {
    const paused = { ...MON, status: 'paused' as const };
    const facts = { rules: [paused], lessonsTotal: 8, lessons: [], now: NOW };
    expect(planExtend(facts)?.paused).toBe(true);
    const open = { ...MON, ends_on: null };
    expect(planExtend({ rules: [open], lessonsTotal: 8, lessons: [], now: NOW })).toBeNull();
  });
});
