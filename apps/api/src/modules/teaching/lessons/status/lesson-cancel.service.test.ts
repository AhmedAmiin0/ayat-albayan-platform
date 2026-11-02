import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import { conflict } from '@/common/http/errors';
import { ruleRow } from '@/modules/teaching/scheduling/scheduling.fakes';
import type { ScheduleRepo } from '@/modules/teaching/scheduling/schedule.repo';
import { LessonCancelService } from './lesson-cancel.service';
import type { LessonRow } from '@/modules/teaching/lessons/store/lesson-row';
import { ADMIN, appliedChange, fakeStore, LESSON_ID, lessonRow, RULE_ID } from '@/modules/teaching/lessons/lessons.fakes';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';

const rules = { rule: vi.fn() };
const NOW = new Date('2026-10-04T10:00:00Z'); // Sunday 13:00 Riyadh, 4 h before the lesson
const LATER = { id: 'l2', status: 'confirmed' as const, starts_at: '2026-10-06T14:00:00+00:00' };

function setup(row: LessonRow | null = lessonRow(), lateCancelHours: number | null = null) {
  const deps = fakeStore(row);
  const service = new LessonCancelService(deps.store, rules as unknown as ScheduleRepo, readerOf(LessonsSettings, { booking_horizon_weeks: 5, late_cancel_hours: lateCancelHours }));
  return { ...deps, service };
}
const body = (over: object = {}) => ({ scope: 'one' as const, by: 'teacher' as const, reason: 'ظرف طارئ', ...over });

describe('LessonCancelService.cancel (R-SCH-07)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ now: NOW });
    rules.rule.mockResolvedValue(ruleRow());
  });
  afterEach(() => vi.useRealTimers());

  it('one occurrence by the teacher: cancelled_by_teacher, reason kept, not chargeable, audited', async () => {
    const { service, writer, record } = setup();
    expect(await service.cancel({ lessonId: LESSON_ID, body: body(), actor: ADMIN })).toEqual([LESSON_ID]);
    expect(appliedChange(writer)).toEqual({
      actor: ADMIN.id,
      changes: [{ id: LESSON_ID, from_status: 'scheduled', to_status: 'cancelled_by_teacher', cancel_reason: 'ظرف طارئ', chargeable: false }],
    });
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'lessons', action: 'cancel' }));
  });

  it('a student cancel 4 h before: free with the setting OFF, consumed with late_cancel_hours = 6', async () => {
    const off = setup();
    await off.service.cancel({ lessonId: LESSON_ID, body: body({ by: 'student' }), actor: ADMIN });
    expect(appliedChange(off.writer)?.changes[0]).toMatchObject({ to_status: 'excused', chargeable: false });
    const on = setup(lessonRow(), 6);
    await on.service.cancel({ lessonId: LESSON_ID, body: body({ by: 'student' }), actor: ADMIN });
    expect(appliedChange(on.writer)?.changes[0]).toMatchObject({ to_status: 'excused', chargeable: true });
  });

  it('only open lessons can be cancelled → 409 invalid_transition with the cancel event', async () => {
    const { service } = setup(lessonRow({ status: 'completed' }));
    await expect(service.cancel({ lessonId: LESSON_ID, body: body({ by: 'admin' }), actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'invalid_transition', from: 'completed', event: 'cancel_by_admin' },
    });
  });

  it('scope rule: this and every later open lesson, and the rule ends the day before', async () => {
    const { service, writer, queries, record } = setup();
    queries.openOfRule.mockResolvedValue([{ id: LESSON_ID, status: 'scheduled', starts_at: lessonRow().starts_at }, LATER]);
    const ids = await service.cancel({ lessonId: LESSON_ID, body: body({ scope: 'rule' }), actor: ADMIN });
    expect(ids).toEqual([LESSON_ID, 'l2']);
    expect(queries.openOfRule).toHaveBeenCalledWith(RULE_ID, new Date('2026-10-04T14:00:00Z'));
    const change = appliedChange(writer);
    expect(change?.end_rule).toEqual({ id: RULE_ID, ends_on: '2026-10-03' });
    expect(change?.changes.map((c: { to_status: string }) => c.to_status)).toEqual(['cancelled_by_teacher', 'cancelled_by_teacher']);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'schedule_rules', action: 'cancel' }));
  });

  it('scope rule on a one-off lesson → 400 no_rule', async () => {
    const { service } = setup(lessonRow({ rule_id: null }));
    await expect(service.cancel({ lessonId: LESSON_ID, body: body({ scope: 'rule' }), actor: ADMIN })).rejects.toMatchObject({
      status: 400,
      response: { code: 'no_rule' },
    });
  });

  it('the RPC refusing an ended rule surfaces as 409 rule_not_active', async () => {
    const { service, writer } = setup();
    writer.apply.mockRejectedValue(conflict('rule_not_active'));
    await expect(service.cancel({ lessonId: LESSON_ID, body: body({ scope: 'rule' }), actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'rule_not_active' },
    });
  });
});

describe('LessonCancelService.cancelRule — POST /schedule-rules/:id/cancel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ now: NOW });
    rules.rule.mockResolvedValue(ruleRow());
  });
  afterEach(() => vi.useRealTimers());

  it('from defaults to today in the rule tz: cancels from local midnight, ends yesterday', async () => {
    const { service, writer, queries } = setup();
    queries.openOfRule.mockResolvedValue([LATER]);
    expect(await service.cancelRule({ ruleId: RULE_ID, body: { by: 'admin', reason: 'انسحب' }, actor: ADMIN })).toEqual(['l2']);
    expect(queries.openOfRule).toHaveBeenCalledWith(RULE_ID, new Date('2026-10-03T21:00:00Z'));
    expect(appliedChange(writer)?.end_rule).toEqual({ id: RULE_ID, ends_on: '2026-10-03' });
  });

  it('an explicit from date, and a rule with nothing left still ends', async () => {
    const { service, writer } = setup();
    await service.cancelRule({ ruleId: RULE_ID, body: { by: 'admin', reason: 'x', from: '2026-10-20' }, actor: ADMIN });
    expect(appliedChange(writer)).toMatchObject({ end_rule: { ends_on: '2026-10-19' }, changes: [] });
  });

  it('a from date before today in the rule tz → 400 date_in_past, nothing written (issue B2)', async () => {
    const { service, writer } = setup();
    const body = { by: 'admin' as const, reason: 'x', from: '2026-10-01' };
    await expect(service.cancelRule({ ruleId: RULE_ID, body, actor: ADMIN })).rejects.toMatchObject({
      status: 400,
      response: { code: 'date_in_past' },
    });
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('404 unknown rule, 409 rule_not_active for an ended one', async () => {
    const { service } = setup();
    rules.rule.mockResolvedValueOnce(null);
    await expect(service.cancelRule({ ruleId: RULE_ID, body: { by: 'admin', reason: 'x' }, actor: ADMIN })).rejects.toMatchObject({ status: 404 });
    rules.rule.mockResolvedValueOnce(ruleRow({ status: 'ended' }));
    await expect(service.cancelRule({ ruleId: RULE_ID, body: { by: 'admin', reason: 'x' }, actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'rule_not_active' },
    });
  });
});
