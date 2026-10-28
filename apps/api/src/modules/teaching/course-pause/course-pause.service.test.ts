import { describe, expect, it } from 'vitest';
import type { CoursePauseFollowUps } from './course-pause.follow-ups';
import { PAUSE, pauseMocks, resetPauseMocks, rpcOut, STUDENT } from './course-pause.fakes';
import type { CoursePauseQueries } from './course-pause.queries';
import { CoursePauseService } from './course-pause.service';

function service() {
  const m = pauseMocks();
  resetPauseMocks(m);
  const svc = new CoursePauseService(m.queries as unknown as CoursePauseQueries, m.follow as unknown as CoursePauseFollowUps);
  return { m, svc };
}

describe('CoursePauseService.resumePause (manual and the daily job)', () => {
  it('runs the follow-ups once when the RPC resumed the pause', async () => {
    const { m, svc } = service();
    const out = rpcOut({ resumed: true, days: 10, cancelled: [], left: [], reopened: ['l3'], rule_ids: ['r1'] });
    m.queries.call.mockResolvedValue(out);
    const res = await svc.resumePause(PAUSE, null);
    expect(m.queries.call).toHaveBeenCalledWith('course_pause_resume', { pause_id: PAUSE, actor: null });
    expect(m.follow.after).toHaveBeenCalledWith(out, null);
    expect(res).toMatchObject({ reopened: 1, cancelled: 0 });
  });

  it('is idempotent: an already resumed pause (resumed false) books nothing again and recomputes nothing', async () => {
    const { m, svc } = service();
    m.queries.call.mockResolvedValue(rpcOut({ resumed: false, days: 10, cancelled: [], left: [] }));
    const res = await svc.resumePause(PAUSE, null);
    expect(m.follow.after).not.toHaveBeenCalled();
    expect(res.conflicts).toBe(0);
  });

  it('a resume of a student without an open pause is 409 pause_not_open, before any RPC', async () => {
    const { m, svc } = service();
    m.queries.openPause.mockResolvedValue(null);
    await expect(svc.resume({ studentId: STUDENT, body: {}, actor: { id: 'u1' } })).rejects.toMatchObject({ response: { code: 'pause_not_open' } });
    expect(m.queries.call).not.toHaveBeenCalled();
  });
});

describe('CoursePauseService.beginPause (a pause from a later day, on its from day)', () => {
  it('runs the follow-ups only when the RPC began it now', async () => {
    const { m, svc } = service();
    m.queries.call.mockResolvedValue(rpcOut({ started: true }));
    await svc.beginPause(PAUSE);
    expect(m.queries.call).toHaveBeenCalledWith('course_pause_begin', { pause_id: PAUSE, actor: null });
    expect(m.follow.after).toHaveBeenCalledTimes(1);
    m.queries.call.mockResolvedValue(rpcOut({ started: false }));
    await svc.beginPause(PAUSE);
    expect(m.follow.after).toHaveBeenCalledTimes(1);
  });
});
