import { courseChangeCheckSchema } from '@ab/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorCode } from '../../../../common/http/errors';
import { BODY, RULE_A, RULE_B, SALES, setup, SUB } from './course-change.fakes';

// REMAINING (review fix 2) and the change point's guards (review fix 4, 7) of CourseChange.

const check = (o: object = {}) => courseChangeCheckSchema.parse({ ...BODY, ...o });
const failed = (p: Promise<unknown>) => p.then(() => undefined, (e: unknown) => errorCode(e));
const lesson = (id: string, status: string) => ({ id, status, chargeable: true, makeup: false, instant: false });

describe('CourseChange — REMAINING counts every lesson of the course that stays', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-18T08:00:00Z'), toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('a counted lesson after the change point that does not move (a late excuse) still counts; moved ones do not', async () => {
    const { service, lessons } = setup();
    // l9 is open and moves; x1 (excused, chargeable) is after the change point and stays.
    lessons.ofCourse.mockResolvedValue([lesson('c1', 'completed'), lesson('l9', 'scheduled'), lesson('x1', 'excused')]);
    expect((await service.check(check(), SALES)).remaining).toBe(6);
    expect(lessons.ofCourse).toHaveBeenCalledWith({ ruleIds: ['ra', 'rb'], studentId: SUB.student_id });
  });

  it('lessons used before the platform (owner 2026-10-28) are not booked again', async () => {
    const { service, lessons, queries } = setup();
    queries.subscription.mockResolvedValue({ ...SUB, lessons_used_before: 1 });
    lessons.ofCourse.mockResolvedValue([lesson('c1', 'completed'), lesson('l9', 'scheduled'), lesson('x1', 'excused')]);
    expect((await service.check(check(), SALES)).remaining).toBe(5);
  });

  it('the old rules’ occurrences before the change point not generated yet are counted', async () => {
    const { service, lessons } = setup();
    // Nothing generated: Mon 19 + Wed 21 Oct will still be generated (both rules end Sat 24).
    lessons.held.mockResolvedValue(new Set());
    expect((await service.check(check(), SALES)).remaining).toBe(6);
    // An open-ended rule counts up to the day before the change point only.
    const open = setup({ rules: [{ ...RULE_A, ends_on: null }] });
    open.lessons.held.mockResolvedValue(new Set());
    expect((await open.service.check(check({ byday: [0, 2] }), SALES)).remaining).toBe(7);
  });
});

describe('CourseChange — where a change may start', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-18T08:00:00Z'), toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('400 starts_before_subscription: before the subscription starts', async () => {
    const { service, queries } = setup();
    queries.subscription.mockResolvedValue({ ...SUB, starts_on: '2026-11-01' });
    expect(await failed(service.check(check(), SALES))).toBe('starts_before_subscription');
  });

  it('400 starts_before_course: before the course’s first rule starts (a renewal booked ahead)', async () => {
    const { service } = setup({ rules: [{ ...RULE_A, starts_on: '2026-11-02' }, { ...RULE_B, starts_on: '2026-11-02' }] });
    expect(await failed(service.check(check(), SALES))).toBe('starts_before_course');
  });

  it('409 course_exists: the new days overlap another weekly course of the student', async () => {
    const { service, queries } = setup();
    queries.others.mockResolvedValue([{ starts_on: '2026-11-12', ends_on: '2026-12-10', package: '8', subscription_id: 'other' }]);
    expect(await failed(service.check(check(), SALES))).toBe('course_exists');
    queries.others.mockResolvedValue([{ starts_on: '2026-11-18', ends_on: '2026-12-10', package: '8', subscription_id: 'other' }]);
    expect((await service.check(check(), SALES)).endsOn).toBe('2026-11-17');
    expect(queries.others).toHaveBeenCalledWith(SUB);
  });

  it('400 no_change: the same weekdays and times as now', async () => {
    const { service } = setup({ rules: [{ ...RULE_A, byday: [0] }, { ...RULE_B, byday: [2], start_time_local: '19:30:00' }] });
    expect(await failed(service.check(check(), SALES))).toBe('no_change');
  });
});
