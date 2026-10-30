import { courseChangeCheckSchema } from '@ab/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorCode } from '@/common/http/errors';
import { BODY, RULE_A, SALES, setup } from './course-change.fakes';
import type { ChangeRule, CourseRuleRef } from './course-change.queries';

// PR #464 review B2 (migration 991): a course whose rule has no subscription_id (imported, calendar
// handover, admin booking) is found through course_rules_of. Its lessons count only inside the
// package's period; a rule it cannot attribute is 409 course_unattributed.

const check = () => courseChangeCheckSchema.parse(BODY);
const failed = (p: Promise<unknown>) => p.then(() => undefined, (e: unknown) => errorCode(e));
const ref = (over: Partial<CourseRuleRef> = {}): CourseRuleRef => ({
  rule_id: 'ra',
  linked: false,
  clean: true,
  from_on: '2026-10-01',
  until_on: null,
  ...over,
});
/** An imported open-ended rule, running since August. */
const IMPORTED: ChangeRule = { ...RULE_A, starts_on: '2026-08-02', ends_on: null, course: ref() };
const done = (id: string, day: string) => ({
  id,
  rule_id: 'ra',
  local_date: day,
  status: 'completed' as const,
  chargeable: true,
  makeup: false,
  instant: false,
});

describe('CourseChange — a rule without subscription_id', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-18T08:00:00Z'), toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it("is the course's: the change plans (no 404 course_not_found)", async () => {
    const { service } = setup({ rules: [IMPORTED] });
    expect((await service.check(check(), SALES)).remaining).toBeGreaterThan(0);
  });

  it('only its lessons inside the package period count (an earlier package used the rest)', async () => {
    const { service, lessons } = setup({ rules: [IMPORTED] });
    lessons.held.mockResolvedValue(new Set(['ra:2026-10-05', 'ra:2026-10-12']));
    lessons.ofCourse.mockResolvedValue([
      done('old1', '2026-09-14'),
      done('old2', '2026-09-21'),
      done('c1', '2026-10-05'),
      done('c2', '2026-10-12'),
    ]);
    // 8 − the two held in this package's period (Oct 5, 12) − Mon Oct 19 still to be generated
    // before the change point. September belongs to the last package (unbounded: 3).
    expect((await service.check(check(), SALES)).remaining).toBe(5);
  });

  it('a group rule or one running into the next package: 409 course_unattributed', async () => {
    const group = { ...IMPORTED, course: ref({ clean: false }) };
    expect(await failed(setup({ rules: [group] }).service.check(check(), SALES))).toBe(
      'course_unattributed',
    );
    // An ended one it cannot attribute is history only: no refusal.
    const ended: ChangeRule = { ...group, status: 'ended', ends_on: '2026-10-10' };
    const { service } = setup({ rules: [ended, { ...RULE_A, id: 'rn' }] });
    expect(await failed(service.check(check(), SALES))).toBeUndefined();
  });
});
