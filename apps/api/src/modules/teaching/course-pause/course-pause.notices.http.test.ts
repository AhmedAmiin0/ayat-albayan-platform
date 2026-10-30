import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAUSE, rpcOut, SALES, STUDENT } from './course-pause.fakes';
import { pauseNoticesApp, TEACHER } from './course-pause.notices.fakes';

// A pause and a resume through the real routes (owner 2026-10-30): ONE course_paused or
// course_resumed to the teacher and the guardian, never a lesson_cancelled per lesson it took.

type App = Awaited<ReturnType<typeof pauseNoticesApp>>;
const NOW = new Date('2026-10-28T20:30:00Z');
const URL = `/students/${STUDENT}/course-pause`;
interface Row {
  template_key: string;
  dedup_key: string;
}
const lesson = (id: string, startsAt: string) => ({ id, starts_at: startsAt, teacher: TEACHER });

describe('course pause notices (owner 2026-10-30)', () => {
  let t: App;
  beforeAll(async () => {
    t = await pauseNoticesApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    t.reset();
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  const queued = () => t.m.notices.queue.mock.calls.flatMap(([rows]) => rows as Row[]);

  it('POST …/course-pause: one course_paused each, naming the first lesson taken', async () => {
    t.m.notices.lessons.mockResolvedValue([lesson('l2', '2026-11-03T14:00:00Z'), lesson('l1', '2026-11-01T14:00:00Z')]);
    expect((await t.post(URL, 'sales', { reason: 'سفر' })).statusCode).toBe(201);
    expect(t.m.notices.lessons).toHaveBeenCalledWith(['l1', 'l2', 'g1']);
    expect(queued().map((r) => [r.template_key, r.dedup_key])).toEqual([
      ['course_paused', `course_paused:${PAUSE}:t:T1`],
      ['course_paused', `course_paused:${PAUSE}:g:G1`],
    ]);
    // The assistant made it: the teacher's and the guardian's bells, none to her.
    expect(t.m.push.notifyProfiles.mock.calls.map(([p]) => p.profileIds[0])).toEqual(['pT1', 'pG1']);
    expect(t.m.push.notifyProfiles.mock.calls.every(([p]) => p.profileIds[0] !== SALES)).toBe(true);
  });

  it('POST …/course-pause/resume: one course_resumed each, with the first lesson back', async () => {
    t.m.queries.call.mockResolvedValue(rpcOut({ resumed: true, cancelled: [], left: [], reopened: ['l3'] }));
    t.m.notices.nextLesson.mockResolvedValue(lesson('l3', '2026-11-05T14:00:00Z'));
    expect((await t.post(`${URL}/resume`, 'admin')).statusCode).toBe(200);
    expect(t.m.notices.nextLesson).toHaveBeenCalledWith(STUDENT, NOW);
    expect(queued().map((r) => r.dedup_key)).toEqual([`course_resumed:${PAUSE}:t:T1`, `course_resumed:${PAUSE}:g:G1`]);
  });

  it('a resume replayed (already resumed): nothing again', async () => {
    t.m.queries.call.mockResolvedValue(rpcOut({ resumed: false, cancelled: [], left: [] }));
    await t.post(`${URL}/resume`, 'admin');
    expect(t.m.notices.queue).not.toHaveBeenCalled();
  });
});
