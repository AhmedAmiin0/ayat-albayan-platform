import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { fakePolicy } from '@/modules/messaging/notification-rules/policy/policy.fakes';
import { BusyRepo } from './conflicts/busy.repo';
import { LessonWriter } from './occurrences/lesson-writer';
import { ruleRow } from './scheduling.fakes';
import { ruleStudents, ScheduleRepo } from './schedule.repo';

const SPAN = { from: new Date('2026-10-04T14:00:00Z'), to: new Date('2026-10-04T14:45:00Z') };

describe('ScheduleQueries', () => {
  it('rule: one row with teacher link and students; activeRuleIds: active and not ended before today', async () => {
    const { db, calls } = fakeDb({ schedule_rules: [{ data: ruleRow() }, { data: [{ id: 'r1' }] }] });
    const q = new ScheduleRepo(db);
    expect((await q.rule('r1'))?.id).toBe(ruleRow().id);
    expect(await q.activeRuleIds('2026-10-01')).toEqual([{ id: 'r1' }]);
    expect(calls).toContainEqual({ table: 'schedule_rules', method: 'eq', args: ['status', 'active'] });
    expect(calls).toContainEqual({ table: 'schedule_rules', method: 'or', args: ['ends_on.is.null,ends_on.gte.2026-10-01'] });
  });

  it('ruleStudents lists ids and link overrides', () => {
    expect(ruleStudents(ruleRow())).toEqual({ ids: [ruleRow().schedule_rule_students[0]?.student_id], overrides: [null] });
  });
});

describe('BusyQueries — occupying lessons only (R-SCH-04)', () => {
  it("teacher lessons overlapping the span, as Dates", async () => {
    const { db, calls } = fakeDb({ lessons: [{ data: [{ id: 'a', starts_at: '2026-10-04T14:30:00+00:00', ends_at: '2026-10-04T15:15:00+00:00' }] }] });
    const rows = await new BusyRepo(db).teacherLessons('t1', SPAN);
    expect(rows).toEqual([{ id: 'a', starts_at: new Date('2026-10-04T14:30:00Z'), ends_at: new Date('2026-10-04T15:15:00Z') }]);
    expect(calls).toContainEqual({ table: 'lessons', method: 'in', args: ['status', ['scheduled', 'confirmed', 'completed', 'late', 'no_show']] });
    expect(calls).toContainEqual({ table: 'lessons', method: 'lt', args: ['starts_at', SPAN.to.toISOString()] });
    expect(calls).toContainEqual({ table: 'lessons', method: 'gt', args: ['ends_at', SPAN.from.toISOString()] });
  });

  it('student lessons: one row per (lesson, student); no students → no query', async () => {
    const { db, calls } = fakeDb({
      lesson_students: [{ data: [{ student_id: 's1', lessons: { id: 'b', starts_at: '2026-10-04T14:00:00Z', ends_at: '2026-10-04T14:45:00Z', status: 'scheduled' } }] }],
    });
    const q = new BusyRepo(db);
    expect(await q.studentLessons([], SPAN)).toEqual([]);
    expect(calls).toEqual([]);
    expect(await q.studentLessons(['s1'], SPAN)).toEqual([{ id: 'b', student_id: 's1', starts_at: SPAN.from, ends_at: SPAN.to }]);
    expect(calls).toContainEqual({ table: 'lesson_students', method: 'in', args: ['lessons.status', ['scheduled', 'confirmed', 'completed', 'late', 'no_show']] });
  });
});

describe('LessonWriter — RPC calls (migrations 080, 100)', () => {
  it('generate: nothing to insert → no call; else p_rule / p_lessons / p_actor, inserted rows parsed', async () => {
    const { db, calls } = fakeDb({ 'rpc:generate_rule_lessons': [{ data: [{ id: 'l1', starts_at: 'a', ends_at: 'b', status: 'scheduled' }] }] });
    const writer = new LessonWriter(db, fakePolicy());
    expect(await writer.generate({ ruleId: 'r1', lessons: [], actorId: null })).toEqual([]);
    expect(calls).toEqual([]);
    const lessons = [{ starts_at: 'a', ends_at: 'b', meeting_link: null }];
    expect(await writer.generate({ ruleId: 'r1', lessons, actorId: 'u1' })).toEqual([{ id: 'l1', starts_at: 'a', ends_at: 'b' }]);
    expect(calls[0]?.args[0]).toEqual({ p_rule: 'r1', p_lessons: lessons, p_actor: 'u1' });
  });

  it('apply sends the change set as `p`; a failed compare-and-set → 409 invalid_transition', async () => {
    const { db, argsOf } = fakeDb({
      'rpc:apply_lesson_changes': [{ data: null }, { error: { code: 'P0001', message: 'invalid_transition' } }],
    });
    const writer = new LessonWriter(db, fakePolicy());
    await writer.apply({ actor: null, changes: [] });
    expect(argsOf('rpc:apply_lesson_changes', 'rpc')).toEqual([{ p: { actor: null, changes: [] } }]);
    await expect(writer.apply({ actor: null })).rejects.toMatchObject({ response: { code: 'invalid_transition' } });
  });
});
