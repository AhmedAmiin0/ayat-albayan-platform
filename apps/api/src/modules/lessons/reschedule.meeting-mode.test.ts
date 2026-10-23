import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '../../common/settings/settings.fakes';
import type { ConflictChecker } from '../scheduling/conflict-checker';
import { ruleRow } from '../scheduling/scheduling.fakes';
import type { ScheduleQueries } from '../scheduling/schedule.queries';
import type { TeachersQueries } from '../teachers/teachers.queries';
import { ADMIN, appliedChange, fakeStore, LESSON_ID, lessonRow, OTHER_TEACHER_ID, TEACHER_ID } from './lessons.fakes';
import { LessonsSettings } from './lessons.settings';
import { RescheduleOneService } from './reschedule-one.service';
import { RescheduleRuleService } from './reschedule-rule.service';
import { RulePlanner } from './rule-planner';

// teachers.meeting_mode (migration 490): a moved lesson's confirmation follows the NEW teacher's
// mode, so a move to a platform teacher names no fixed link and a move to a static one names it.

const teachers = { get: vi.fn() };
const checker = { check: vi.fn() };
const rules = { rule: vi.fn() };
const SUB_LINK = 'https://meet.google.com/sub-code-xyz';
/** The original teacher holds lessons in our classroom; the substitute keeps a fixed link. */
const platformTeacher = async ({ teacherId }: { teacherId: string }) => teacherId === TEACHER_ID;

describe('reschedule — the new teacher decides the confirmation link', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ now: new Date('2026-10-02T10:00:00Z') });
    checker.check.mockResolvedValue([]);
    rules.rule.mockResolvedValue(ruleRow());
    teachers.get.mockResolvedValue({ id: OTHER_TEACHER_ID, meeting_link: SUB_LINK });
  });
  afterEach(() => vi.useRealTimers());

  it('one lesson, same platform teacher: plain confirmation, the row keeps its fixed link', async () => {
    const { store, writer, queries } = fakeStore(lessonRow());
    queries.meetingLinkAuto.mockImplementation(platformTeacher);
    const service = new RescheduleOneService(store, teachers as unknown as TeachersQueries, checker as unknown as ConflictChecker);
    await service.reschedule({ lessonId: LESSON_ID, body: { scope: 'one', startsAt: '2026-10-05T17:00:00+03:00' }, actor: ADMIN });
    expect(queries.meetingLinkAuto).toHaveBeenCalledWith({ teacherId: TEACHER_ID });
    expect(appliedChange(writer)?.messages[0]?.template_key).toBe('booking_confirmation_plain');
    expect(appliedChange(writer)?.lessons[0]?.meeting_link).toBe('https://meet.jit.si/abrar');
  });

  it('one lesson moved from a platform teacher to a static substitute: the confirmation names the fixed link', async () => {
    const { store, writer, queries } = fakeStore(lessonRow());
    queries.meetingLinkAuto.mockImplementation(platformTeacher);
    const service = new RescheduleOneService(store, teachers as unknown as TeachersQueries, checker as unknown as ConflictChecker);
    const body = { scope: 'one' as const, startsAt: '2026-10-05T17:00:00+03:00', teacherId: OTHER_TEACHER_ID };
    await service.reschedule({ lessonId: LESSON_ID, body, actor: ADMIN });
    expect(queries.meetingLinkAuto).toHaveBeenCalledWith({ teacherId: OTHER_TEACHER_ID });
    expect(appliedChange(writer)?.messages[0]?.template_key).toBe('booking_confirmation_meet');
  });

  it('the whole rule moved to a platform substitute: plain confirmation', async () => {
    const { store, writer, queries } = fakeStore(lessonRow());
    queries.meetingLinkAuto.mockImplementation(async ({ teacherId }) => teacherId === OTHER_TEACHER_ID);
    const planner = new RulePlanner(rules as unknown as ScheduleQueries, teachers as unknown as TeachersQueries, readerOf(LessonsSettings, { booking_horizon_weeks: 2 }));
    const service = new RescheduleRuleService(store, planner, checker as unknown as ConflictChecker);
    const newRule = { teacherId: OTHER_TEACHER_ID, byday: [1, 3], startTimeLocal: '18:30', tz: 'Asia/Riyadh', durationMin: 60 as const, startsOn: '2026-10-12' };
    await service.reschedule({ lessonId: LESSON_ID, body: { scope: 'rule', newRule }, actor: ADMIN });
    expect(queries.meetingLinkAuto).toHaveBeenCalledWith({ teacherId: OTHER_TEACHER_ID });
    expect(appliedChange(writer)?.messages[0]?.template_key).toBe('booking_confirmation_plain');
    expect(appliedChange(writer)?.lessons[0]?.meeting_link).toBe(SUB_LINK);
  });
});
