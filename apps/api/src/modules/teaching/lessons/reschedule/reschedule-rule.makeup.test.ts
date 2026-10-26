import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '../../../../common/settings/settings.fakes';
import type { ConflictChecker } from '../../scheduling/conflicts/conflict-checker';
import { ruleRow } from '../../scheduling/scheduling.fakes';
import type { ScheduleQueries } from '../../scheduling/schedule.queries';
import type { TeachersQueries } from '../../../people/teachers/teachers.queries';
import { ADMIN, fakeStore, LESSON_ID, lessonRow, TEACHER_ID } from '../lessons.fakes';
import { LessonsSettings } from '../lessons.settings';
import { RescheduleRuleService } from './reschedule-rule.service';
import { RulePlanner } from './rule-planner';

const rules = { rule: vi.fn() };
const teachers = { get: vi.fn() };
const checker = { check: vi.fn() };
const NEW_RULE = { teacherId: TEACHER_ID, byday: [1], startTimeLocal: '18:30', tz: 'Asia/Riyadh', durationMin: 60 as const, startsOn: '2026-10-12' };

function setup(makeupOf: string | null) {
  const deps = fakeStore(lessonRow({ makeup_of_id: makeupOf }));
  const planner = new RulePlanner(rules as unknown as ScheduleQueries, teachers as unknown as TeachersQueries, readerOf(LessonsSettings, { booking_horizon_weeks: 2 }));
  return { ...deps, service: new RescheduleRuleService(deps.store, planner, checker as unknown as ConflictChecker) };
}

describe('RescheduleRuleService — a makeup moves one lesson at a time (R-SCH-10)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ now: new Date('2026-10-02T10:00:00Z') });
    rules.rule.mockResolvedValue(ruleRow());
    checker.check.mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it("scope 'rule' on a makeup → 400 makeup_scope_one, nothing written (the new rule would drop the link)", async () => {
    const { service, writer } = setup('77777777-7777-4777-8777-777777777777');
    const body = { scope: 'rule' as const, newRule: NEW_RULE };
    await expect(service.reschedule({ lessonId: LESSON_ID, body, actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'makeup_scope_one' },
      status: 400,
    });
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('a normal lesson still moves with its rule', async () => {
    const { service, writer, queries } = setup(null);
    queries.openOfRule.mockResolvedValue([]);
    const body = { scope: 'rule' as const, newRule: NEW_RULE };
    await expect(service.reschedule({ lessonId: LESSON_ID, body, actor: ADMIN })).resolves.toBeTypeOf('string');
    expect(writer.apply).toHaveBeenCalledTimes(1);
  });
});
