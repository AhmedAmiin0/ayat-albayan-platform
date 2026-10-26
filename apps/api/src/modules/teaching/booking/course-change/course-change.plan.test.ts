import { courseChangeCheckSchema, type CourseLessonFact } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { errorCode } from '../../../../common/http/errors';
import { assertChange, planChange, type ChangeFacts } from './course-change.plan';

const NOW = new Date('2026-10-18T08:00:00Z');
// Sun 25 Oct 17:00 and Tue 27 Oct 19:30 (Riyadh), from the change point Sun 25 Oct.
const REQ = courseChangeCheckSchema.parse({
  subscriptionId: '00000000-0000-4000-8000-000000000001',
  byday: [0, 2],
  startTimeLocal: '17:00',
  dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }],
  startsOn: '2026-10-25',
  startsAt: '2026-10-25T14:00:00.000Z',
});
const held = (o: Partial<CourseLessonFact> = {}): CourseLessonFact => ({ status: 'completed', chargeable: true, makeup: false, instant: false, ...o });
const FACTS: ChangeFacts = { role: 'sales', perWeek: 2, lessonsTotal: 8, durationMin: 45, tz: 'Asia/Riyadh', before: [] };
const code = (run: () => unknown): string | undefined => {
  try {
    run();
    return undefined;
  } catch (e) {
    return errorCode(e);
  }
};

describe('planChange — the remaining lessons on the new days', () => {
  it('REMAINING = lessons_total − the counted lessons before; the new rules end on the REMAINING-th', () => {
    // 3 held + 1 booked count; a cancelled and a not-chargeable one give their place back → 4 left.
    const before = [held(), held(), held({ status: 'no_show' }), held({ status: 'scheduled' }), held({ status: 'cancelled_by_teacher' }), held({ status: 'excused', chargeable: false })];
    const plan = planChange({ req: REQ, facts: { ...FACTS, before }, now: NOW, horizonWeeks: 5 });
    expect(plan.remaining).toBe(4);
    // Sun 25, Tue 27, Sun 1, Tue 3 Nov.
    expect(plan.endsOn).toBe('2026-11-03');
    expect(plan.plans.flatMap((p) => p.occurrences)).toHaveLength(4);
    expect(plan.plans.map((p) => p.timing.ends_on)).toEqual(['2026-11-03', '2026-11-03']);
    expect(plan.plans.map((p) => p.timing.start_time_local)).toEqual(['17:00', '19:30']);
  });
  it('a change before the course used anything carries the whole plan (8)', () => {
    const plan = planChange({ req: REQ, facts: FACTS, now: NOW, horizonWeeks: 5 });
    expect(plan.plans.flatMap((p) => p.occurrences)).toHaveLength(8);
    expect(plan.endsOn).toBe('2026-11-17');
  });
  it('nothing left → 409 course_finished', () => {
    const before = Array.from({ length: 8 }, () => held());
    expect(code(() => planChange({ req: REQ, facts: { ...FACTS, before }, now: NOW, horizonWeeks: 5 }))).toBe('course_finished');
  });
});

describe('assertChange — the guard', () => {
  it('the first new lesson must be in the future', () => {
    expect(code(() => assertChange(REQ, FACTS, new Date('2026-10-25T14:00:00Z')))).toBe('date_in_past');
  });
  it('exactly the plan’s days a week, for the assistant and the admin', () => {
    const one = { ...REQ, byday: [0], dayTimes: [] };
    expect(code(() => assertChange(one, FACTS, NOW))).toBe('days_count_mismatch');
    expect(code(() => assertChange(one, { ...FACTS, role: 'admin' }, NOW))).toBe('days_count_mismatch');
  });
  it('the assistant never overrides; a custom count is the admin’s', () => {
    expect(code(() => assertChange({ ...REQ, override: { reason: 'x' } }, FACTS, NOW))).toBe('override_not_allowed');
    expect(code(() => assertChange(REQ, { ...FACTS, perWeek: null }, NOW))).toBe('custom_count_admin');
    expect(code(() => assertChange({ ...REQ, override: { reason: 'x' } }, { ...FACTS, role: 'admin', perWeek: null }, NOW))).toBeUndefined();
  });
});
