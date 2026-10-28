import { describe, expect, it, vi } from 'vitest';
import { rpcOut, STUDENT } from './course-pause.fakes';
import { CoursePauseFollowUps } from './course-pause.follow-ups';
import { CoursePauseLessonsBack, type PauseClashes, type PauseScheduling } from './course-pause.lessons-back';
import { changedLessons, type RpcOut } from './course-pause.mapper';

const clash = { kind: 'teacher_busy', startsAt: '2026-11-12T15:00:00.000Z' };

function harness() {
  const rules = { rule: vi.fn(async (id: string) => ({ id, status: id === 'r-ended' ? 'ended' : 'active' })) };
  const generator = { topUp: vi.fn(async () => ({ conflicts: [clash], lessons: [], until: new Date() })) };
  const queries = { lessons: vi.fn(async () => [
    { id: 'l1', teacher_id: 'tA', starts_at: '2026-11-12T15:00:00Z', ends_at: '2026-11-12T15:45:00Z' },
    { id: 'l2', teacher_id: 'tB', starts_at: '2026-11-13T15:00:00Z', ends_at: '2026-11-13T15:45:00Z' },
  ]) };
  const checker = { check: vi.fn(async ({ teacherId }: { teacherId: string }) => (teacherId === 'tA' ? [clash] : [])) };
  const writer = { flagConflicts: vi.fn() };
  const sched = { rules, generator, settings: { read: async () => ({ booking_horizon_weeks: 6 }) } } as unknown as PauseScheduling;
  const events = { changed: vi.fn() };
  const back = new CoursePauseLessonsBack(sched, { queries, checker, writer } as unknown as PauseClashes, events as never);
  return { rules, generator, queries, checker, writer, back, events };
}

describe('CoursePauseLessonsBack (resume: same days and times, clashes reported)', () => {
  it('tops every resumed active rule up over the horizon and counts its clashes; an ended rule is skipped', async () => {
    const h = harness();
    h.queries.lessons.mockResolvedValue([]);
    const n = await h.back.bookBack(rpcOut({ rule_ids: ['r1', 'r-ended'] }), 'u1');
    expect(h.generator.topUp).toHaveBeenCalledTimes(1);
    expect(h.generator.topUp).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }), { weeks: 6, actorId: 'u1' });
    expect(n).toBe(1);
  });

  it('clash-checks the reopened and rejoined lessons per teacher and stores the clashes on them, never dropping one', async () => {
    const h = harness();
    const n = await h.back.bookBack(rpcOut({ reopened: ['l1'], rejoined: ['l2'] }), null);
    expect(h.queries.lessons).toHaveBeenCalledWith(['l1', 'l2']);
    expect(h.checker.check).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 'tA', studentIds: [STUDENT], excludeIds: ['l1'] }));
    expect(h.writer.flagConflicts).toHaveBeenCalledWith([expect.objectContaining({ id: 'l1' })], [clash]);
    expect(n).toBe(1);
  });
});

describe('CoursePauseFollowUps', () => {
  it('books back (the balance alerts are told which lessons changed) and recomputes the student; sends nothing', async () => {
    const h = harness();
    h.queries.lessons.mockResolvedValue([]);
    const alerts = { evaluateStudents: vi.fn() };
    const audit = { record: vi.fn() };
    const follow = new CoursePauseFollowUps(h.back, alerts as never, audit as never);
    const out: RpcOut = rpcOut({ cancelled: ['a'], left: ['b'], reopened: ['a'] });
    expect(await follow.after(out, 'u1')).toBe(0);
    expect(h.events.changed).toHaveBeenCalledWith(['a', 'b']);
    expect(alerts.evaluateStudents).toHaveBeenCalledWith([STUDENT], { actorId: 'u1' });
    expect(changedLessons(out)).toEqual(['a', 'b']);
    alerts.evaluateStudents.mockClear();
    await follow.liftedLegacy({ studentId: STUDENT, subscriptionIds: ['sub', 'older'], actorId: 'u1' });
    for (const entityId of ['sub', 'older'])
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'subscriptions', entityId, before: { status: 'paused' } }));
    expect(alerts.evaluateStudents).toHaveBeenCalledTimes(1);
  });
});
