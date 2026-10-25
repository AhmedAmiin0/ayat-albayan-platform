import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '../../../common/settings/settings.fakes';
import type { ConflictChecker } from '../../scheduling/conflict-checker';
import { ruleRow } from '../../scheduling/scheduling.fakes';
import type { ScheduleQueries } from '../../scheduling/schedule.queries';
import type { TeachersQueries } from '../../teachers/teachers.queries';
import type { LessonRow } from '../store/lesson-row';
import { ADMIN, appliedChange, fakeStore, LESSON_ID, lessonRow, RULE_ID, STUDENT_ID, TEACHER_ID } from '../lessons.fakes';
import { LessonsSettings } from '../lessons.settings';
import { RescheduleRuleService } from './reschedule-rule.service';
import { RulePlanner } from './rule-planner';

const rules = { rule: vi.fn() };
const teachers = { get: vi.fn() };
const checker = { check: vi.fn() };
const NOW = new Date('2026-10-02T10:00:00Z');
// From Mon 12 Oct: Mon + Wed 18:30 Riyadh (15:30Z), 60 min.
const NEW_RULE = { teacherId: TEACHER_ID, byday: [1, 3], startTimeLocal: '18:30', tz: 'Asia/Riyadh', durationMin: 60 as const, startsOn: '2026-10-12' };
const MOVED = [{ id: 'old-1', status: 'scheduled' as const, starts_at: '2026-10-13T14:00:00+00:00' }];

function setup(row: LessonRow = lessonRow(), weeks = 2) {
  const deps = fakeStore(row);
  const planner = new RulePlanner(rules as unknown as ScheduleQueries, teachers as unknown as TeachersQueries, readerOf(LessonsSettings, { booking_horizon_weeks: weeks }));
  const service = new RescheduleRuleService(deps.store, planner, checker as unknown as ConflictChecker);
  return { ...deps, service };
}
const body = (over: object = {}) => ({ scope: 'rule' as const, newRule: NEW_RULE, ...over });

describe('RescheduleRuleService — move the whole rule (R-SCH-07, docs/10 route 8 `rule`)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ now: NOW });
    rules.rule.mockResolvedValue(ruleRow());
    checker.check.mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it('ends the old rule the day before the tapped lesson, moves its open lessons from that day, creates the new rule + lessons', async () => {
    const { service, writer, queries, record } = setup();
    queries.openOfRule.mockResolvedValue(MOVED);
    const firstId = await service.reschedule({ lessonId: LESSON_ID, body: body(), actor: ADMIN });
    // The tapped lesson is Sun 4 Oct (17:00 Riyadh): cut from its day, not from the new start.
    expect(queries.openOfRule).toHaveBeenCalledWith(RULE_ID, new Date('2026-10-03T21:00:00Z'));
    const change = appliedChange(writer);
    expect(change?.end_rule).toEqual({ id: RULE_ID, ends_on: '2026-10-03' });
    expect(change?.changes).toEqual([{ id: 'old-1', from_status: 'scheduled', to_status: 'rescheduled', chargeable: false }]);
    expect(change?.new_rule).toMatchObject({ teacher_id: TEACHER_ID, byday: [1, 3], starts_on: '2026-10-12', package: '8', student_ids: [STUDENT_ID] });
    expect(change?.lessons.map((l: { starts_at: string }) => l.starts_at)).toEqual(['2026-10-12T15:30:00.000Z', '2026-10-14T15:30:00.000Z']);
    expect(change?.lessons[0]).toMatchObject({ id: firstId, rule_id: change?.new_rule.id, meeting_link: 'https://meet.jit.si/abrar' });
    expect(change?.messages).toHaveLength(1);
    expect(change?.messages[0]?.lesson_id).toBe(firstId);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'schedule_rules', action: 'reschedule' }));
  });

  it('conflict check excludes the lessons being moved; a clash blocks unless overridden', async () => {
    const { service, writer, queries } = setup();
    queries.openOfRule.mockResolvedValue(MOVED);
    const clash = { kind: 'student_busy', startsAt: '2026-10-14T15:30:00.000Z', endsAt: '2026-10-14T16:30:00.000Z' };
    checker.check.mockResolvedValue([clash]);
    await expect(service.reschedule({ lessonId: LESSON_ID, body: body(), actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'conflict', conflicts: [clash] },
    });
    expect(checker.check).toHaveBeenCalledWith(expect.objectContaining({ excludeIds: ['old-1'], studentIds: [STUDENT_ID] }));
    await service.reschedule({ lessonId: LESSON_ID, body: body({ override: { reason: 'مضطرين' } }), actor: ADMIN });
    expect(appliedChange(writer)?.lessons.map((l: { override_reason: string | null }) => l.override_reason)).toEqual([null, 'مضطرين']);
  });

  it('400 no_rule for a one-off lesson; 409 rule_not_active for an ended rule; 409 for a closed lesson', async () => {
    await expect(setup(lessonRow({ rule_id: null })).service.reschedule({ lessonId: LESSON_ID, body: body(), actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'no_rule' },
    });
    rules.rule.mockResolvedValueOnce(ruleRow({ status: 'ended' }));
    await expect(setup().service.reschedule({ lessonId: LESSON_ID, body: body(), actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'rule_not_active' },
    });
    await expect(setup(lessonRow({ status: 'late' })).service.reschedule({ lessonId: LESSON_ID, body: body(), actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'invalid_transition' },
    });
  });

  it('a start beyond the horizon → 400 no_occurrences; an unknown substitute → 404', async () => {
    const far = { ...NEW_RULE, startsOn: '2027-03-01' };
    await expect(setup().service.reschedule({ lessonId: LESSON_ID, body: body({ newRule: far }), actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'no_occurrences' },
    });
    teachers.get.mockResolvedValue(null);
    const sub = { ...NEW_RULE, teacherId: '00000000-0000-4000-8000-0000000000b9' };
    await expect(setup().service.reschedule({ lessonId: LESSON_ID, body: body({ newRule: sub }), actor: ADMIN })).rejects.toMatchObject({ status: 404 });
  });

  it("a substitute's own link applies when the rule changes teacher", async () => {
    teachers.get.mockResolvedValue({ id: 'sub', meeting_link: 'https://meet.google.com/sub-code-xyz' });
    const { service, writer } = setup();
    await service.reschedule({ lessonId: LESSON_ID, body: body({ newRule: { ...NEW_RULE, teacherId: 'sub' } }), actor: ADMIN });
    expect(appliedChange(writer)?.lessons[0]?.meeting_link).toBe('https://meet.google.com/sub-code-xyz');
    expect(appliedChange(writer)?.messages[0]?.template_key).toBe('booking_confirmation_meet');
  });

  it('an override is audited with its reason and the clashes; the old rule is not "busy" for its replacement', async () => {
    const { service, record } = setup();
    const clash = { kind: 'teacher_busy', startsAt: '2026-10-14T15:30:00.000Z', endsAt: '2026-10-14T16:30:00.000Z' };
    checker.check.mockResolvedValue([clash]);
    await service.reschedule({ lessonId: LESSON_ID, body: body({ override: { reason: 'مضطرين' } }), actor: ADMIN });
    expect(checker.check).toHaveBeenCalledWith(expect.objectContaining({ excludeRuleIds: [RULE_ID] }));
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ after: expect.objectContaining({ override_reason: 'مضطرين', conflicts: [clash] }) }),
    );
  });

  it('a later lesson tapped: the earlier ones stay (verifier probe: 5 lessons before it were swept)', async () => {
    const { service, writer, queries } = setup(lessonRow({ starts_at: '2026-10-21T20:30:00+00:00' }), 6);
    queries.openOfRule.mockResolvedValue([]);
    await service.reschedule({ lessonId: LESSON_ID, body: body({ newRule: { ...NEW_RULE, startsOn: '2026-10-22' } }), actor: ADMIN });
    // 23:30 Riyadh on Wed 21 Oct: its own local day, not the UTC one.
    expect(queries.openOfRule).toHaveBeenCalledWith(RULE_ID, new Date('2026-10-20T21:00:00Z'));
    expect(appliedChange(writer)?.end_rule).toEqual({ id: RULE_ID, ends_on: '2026-10-20' });
  });

  it('a past, unmarked lesson tapped: the cut is today, so lessons nobody marked stay open (issue B2)', async () => {
    const { service, writer, queries } = setup(lessonRow({ starts_at: '2026-09-27T14:00:00+00:00' }));
    queries.openOfRule.mockResolvedValue([]);
    await service.reschedule({ lessonId: LESSON_ID, body: body(), actor: ADMIN });
    expect(queries.openOfRule).toHaveBeenCalledWith(RULE_ID, new Date('2026-10-01T21:00:00Z'));
    expect(appliedChange(writer)?.end_rule).toEqual({ id: RULE_ID, ends_on: '2026-10-01' });
  });

  it('a new start before the tapped lesson’s day → 400 starts_before_lesson, nothing written', async () => {
    const { service, writer } = setup(lessonRow({ starts_at: '2026-10-21T14:00:00+00:00' }));
    await expect(service.reschedule({ lessonId: LESSON_ID, body: body(), actor: ADMIN })).rejects.toMatchObject({
      status: 400,
      response: { code: 'starts_before_lesson' },
    });
    expect(appliedChange(writer)).toBeUndefined();
  });

  it('a start before today → 400 date_in_past (would close unmarked lessons, issue B2)', async () => {
    const past = { ...NEW_RULE, startsOn: '2026-09-28' };
    await expect(setup().service.reschedule({ lessonId: LESSON_ID, body: body({ newRule: past }), actor: ADMIN })).rejects.toMatchObject({
      status: 400,
      response: { code: 'date_in_past' },
    });
  });
});
