import { describe, expect, it, vi } from 'vitest';
import { fakePolicy } from '../../../messaging/notification-rules/policy/policy.fakes';
import type { ConflictChecker } from '../conflicts/conflict-checker';
import { LessonWriter } from './lesson-writer';
import { OccurrenceGenerator } from './occurrence-generator';
import { fakeAudit, fakeLessonsDb, ruleRow, STUDENT_ID } from '../scheduling.fakes';

// Friday 2026-10-02 13:00 Riyadh. The Sun/Tue 17:00 rule starts Sunday 4 Oct.
const NOW = new Date('2026-10-02T10:00:00Z');
const DAY = 86_400_000;

function setup() {
  const store = fakeLessonsDb();
  const { audit, record } = fakeAudit();
  const checker = { check: vi.fn().mockResolvedValue([]) };
  const generator = new OccurrenceGenerator(new LessonWriter(store.db, fakePolicy()), checker as unknown as ConflictChecker, audit);
  return { ...store, generator, record, checker };
}

describe('OccurrenceGenerator.topUp — idempotent horizon upsert (R-SCH-02, issue B1)', () => {
  it('first run books every Sun/Tue in the 5-week horizon', async () => {
    const { generator, lessons } = setup();
    const { lessons: inserted, until } = await generator.topUp(ruleRow(), { weeks: 5, actorId: null, now: NOW });
    expect(inserted).toHaveLength(10);
    expect(inserted[0]?.starts_at).toBe('2026-10-04T14:00:00.000Z');
    expect(inserted.at(-1)?.starts_at).toBe('2026-11-03T14:00:00.000Z');
    expect(until.toISOString()).toBe('2026-11-06T10:00:00.000Z');
    expect(lessons.size).toBe(10);
  });

  it('re-running the same horizon inserts zero rows and never duplicates (issue B1)', async () => {
    const { generator, lessons } = setup();
    await generator.topUp(ruleRow(), { weeks: 5, actorId: null, now: NOW });
    const again = await generator.topUp(ruleRow(), { weeks: 5, actorId: null, now: NOW });
    const thrice = await generator.topUp(ruleRow(), { weeks: 5, actorId: null, now: NOW });
    expect(again.lessons).toEqual([]);
    expect(thrice.lessons).toEqual([]);
    expect(lessons.size).toBe(10);
  });

  it('never resurrects or overwrites a cancelled / rescheduled occurrence', async () => {
    const { generator, lessons } = setup();
    await generator.topUp(ruleRow(), { weeks: 5, actorId: null, now: NOW });
    const cancelled = lessons.get(`${ruleRow().id}:2026-10-06T14:00:00.000Z`);
    const moved = lessons.get(`${ruleRow().id}:2026-10-11T14:00:00.000Z`);
    if (!cancelled || !moved) throw new Error('fixture');
    cancelled.status = 'cancelled_by_admin';
    moved.status = 'rescheduled';
    const again = await generator.topUp(ruleRow(), { weeks: 5, actorId: null, now: NOW });
    expect(again.lessons).toEqual([]);
    expect(cancelled.status).toBe('cancelled_by_admin');
    expect(moved.status).toBe('rescheduled');
    expect(lessons.size).toBe(10);
  });

  it('extending the horizon adds only the new weeks', async () => {
    const { generator, lessons } = setup();
    await generator.topUp(ruleRow(), { weeks: 5, actorId: null, now: NOW });
    const more = await generator.topUp(ruleRow(), { weeks: 6, actorId: null, now: NOW });
    expect(more.lessons.map((l) => l.starts_at)).toEqual([
      '2026-11-08T14:00:00.000Z',
      '2026-11-10T14:00:00.000Z',
    ]);
    expect(lessons.size).toBe(12);
  });

  it('the next daily run only adds what rolled into the horizon', async () => {
    const { generator } = setup();
    await generator.topUp(ruleRow(), { weeks: 5, actorId: null, now: NOW });
    const day3 = await generator.topUp(ruleRow(), { weeks: 5, actorId: null, now: new Date(NOW.getTime() + 3 * DAY) });
    expect(day3.lessons.map((l) => l.starts_at)).toEqual(['2026-11-08T14:00:00.000Z']);
  });

  it('copies the link per invariant 3: rule → single student override → teacher', async () => {
    const teacherOnly = setup();
    await teacherOnly.generator.topUp(ruleRow(), { weeks: 5, actorId: null, now: NOW });
    expect([...teacherOnly.lessons.values()][0]?.meeting_link).toBe('https://meet.jit.si/abrar');
    const own = setup();
    const override = [{ student_id: STUDENT_ID, student: { meeting_link_override: 'https://meet.google.com/x' } }];
    await own.generator.topUp(ruleRow({ schedule_rule_students: override }), { weeks: 5, actorId: null, now: NOW });
    expect([...own.lessons.values()][0]?.meeting_link).toBe('https://meet.google.com/x');
  });

  it('a rule starting beyond the horizon makes no DB call', async () => {
    const { generator, rpcCalls } = setup();
    const res = await generator.topUp(ruleRow({ starts_on: '2027-03-01' }), { weeks: 5, actorId: null, now: NOW });
    expect(res.lessons).toEqual([]);
    expect(rpcCalls).toHaveLength(0);
  });

  it('checks the new rows (not against themselves or their rule) and stores their clashes', async () => {
    const { generator, checker, flags } = setup();
    const clash = { kind: 'teacher_busy', startsAt: '2026-10-04T14:00:00.000Z', endsAt: '2026-10-04T14:45:00.000Z' };
    checker.check.mockResolvedValue([clash]);
    const res = await generator.topUp(ruleRow(), { weeks: 2, actorId: null, now: NOW });
    expect(res.lessons).toHaveLength(4);
    expect(checker.check).toHaveBeenCalledWith(
      expect.objectContaining({ excludeIds: res.lessons.map((l) => l.id), excludeRuleIds: [ruleRow().id] }),
    );
    expect(res.conflicts).toEqual([clash]);
    expect(flags).toEqual([{ id: res.lessons[0]?.id, conflicts: [clash] }]);
  });

  it('audits admin extends always, the daily job only when it inserted', async () => {
    const { generator, record } = setup();
    await generator.topUp(ruleRow(), { weeks: 5, actorId: null, now: NOW });
    expect(record).toHaveBeenCalledTimes(1);
    await generator.topUp(ruleRow(), { weeks: 5, actorId: null, now: NOW });
    expect(record).toHaveBeenCalledTimes(1);
    await generator.topUp(ruleRow(), { weeks: 5, actorId: 'admin-1', now: NOW });
    expect(record).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenLastCalledWith(
      expect.objectContaining({ entity: 'schedule_rules', action: 'extend', actorId: 'admin-1' }),
    );
  });

  it('a rule ended concurrently → 409 rule_not_active from the RPC', async () => {
    const { generator, state } = setup();
    state.ruleStatus = 'ended';
    await expect(generator.topUp(ruleRow(), { weeks: 5, actorId: null, now: NOW })).rejects.toMatchObject({
      response: { code: 'rule_not_active' },
    });
  });
});
