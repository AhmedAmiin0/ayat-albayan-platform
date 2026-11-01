import { describe, expect, it, vi } from 'vitest';
import { LessonEvents, type ScheduleChange } from '@/common/infra/events/lesson-events';
import { PAUSE, pauseMocks, resetPauseMocks, rpcOut, STUDENT } from './course-pause.fakes';
import { CoursePauseFollowUps } from './course-pause.follow-ups';
import type { CoursePauseLessonsBack } from './course-pause.lessons-back';
import type { CoursePauseRepo } from './course-pause.repo';
import { CoursePauseService } from './course-pause.service';

function service() {
  const m = pauseMocks();
  resetPauseMocks(m);
  const queries = m.queries as unknown as CoursePauseRepo;
  return { m, svc: new CoursePauseService(queries, m.follow as unknown as CoursePauseFollowUps) };
}

describe('CoursePauseService: the teacher and the family hear a pause or a resume once', () => {
  it('a start: paused with the RPC’s answer and the actor, after the follow-ups', async () => {
    const { m, svc } = service();
    await svc.start({ studentId: STUDENT, body: {}, actor: { id: 'u1' } });
    expect(m.follow.paused).toHaveBeenCalledWith(rpcOut(), 'u1');
    const [after] = m.follow.after.mock.invocationCallOrder;
    const [paused] = m.follow.paused.mock.invocationCallOrder;
    expect(after).toBeLessThan(paused ?? 0);
  });

  it('a resume: resumed after the lessons are booked back; a replayed one (resumed false) nothing', async () => {
    const { m, svc } = service();
    m.queries.call.mockResolvedValue(rpcOut({ resumed: true, cancelled: [], left: [] }));
    await svc.resumePause(PAUSE, null);
    expect(m.follow.resumed).toHaveBeenCalledTimes(1);
    m.queries.call.mockResolvedValue(rpcOut({ resumed: false }));
    await svc.resumePause(PAUSE, null);
    expect(m.follow.resumed).toHaveBeenCalledTimes(1);
  });

  it('a later pause begun by the job: paused again (the same pause id dedups it), only when begun now', async () => {
    const { m, svc } = service();
    m.queries.call.mockResolvedValue(rpcOut({ started: true }));
    await svc.beginPause(PAUSE);
    m.queries.call.mockResolvedValue(rpcOut({ started: false }));
    await svc.beginPause(PAUSE);
    expect(m.follow.paused.mock.calls).toEqual([[rpcOut({ started: true }), null]]);
  });

  it('extending a pause tells nobody', async () => {
    const { m, svc } = service();
    await svc.setUntil({ studentId: STUDENT, body: { untilDate: '2026-12-01' }, actor: { id: 'u1' } });
    expect([m.follow.paused.mock.calls.length, m.follow.resumed.mock.calls.length]).toEqual([0, 0]);
  });
});

describe('CoursePauseFollowUps.paused / resumed → LessonEvents.scheduleChanged', () => {
  it('a pause names the lessons it took (cancelled and left); a resume its pause', async () => {
    const events = new LessonEvents();
    const seen: ScheduleChange[] = [];
    events.onScheduleChange(async (c) => void seen.push(c));
    const back = {} as CoursePauseLessonsBack;
    const follow = new CoursePauseFollowUps(back, {} as never, {} as never, events);
    await follow.paused(rpcOut({ cancelled: ['l1'], left: ['g1'] }), 'u1');
    await follow.resumed(rpcOut(), null);
    expect(seen).toEqual([
      { kind: 'course_paused', pauseId: PAUSE, studentId: STUDENT, lessonIds: ['l1', 'g1'], actorId: 'u1' },
      { kind: 'course_resumed', pauseId: PAUSE, studentId: STUDENT, actorId: null },
    ]);
    expect(vi.isMockFunction(events.scheduleChanged)).toBe(false);
  });
});
