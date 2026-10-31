import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ADMIN,
  BODY,
  profileApp,
  RESULT,
  S1,
  SALES,
  SUB_ID,
  T_NEW,
  T_OLD,
} from './profile-course.fakes';

// «تغيير المعلم» from the student's profile (owner 2026-10-30): the remaining lessons move to the
// new teacher.
type App = Awaited<ReturnType<typeof profileApp>>;
const URL = `/students/${S1}/course-teacher/change`;
const MOVE = { ...BODY, teacherId: T_NEW };
interface NewRule {
  teacher_id: string;
  meeting_link: string | null;
}

describe('POST /students/:id/course-teacher/change', () => {
  let t: App;
  beforeAll(async () => {
    t = await profileApp();
  }, 60_000);
  afterAll(() => t.app.close());
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-10-18T08:00:00Z'), toFake: ['Date'] });
    t.reset();
  });

  it.each([
    ['admin', ADMIN],
    ['sales', SALES],
  ])('%s moves the rest of the course to the new teacher', async (who, actor) => {
    const res = await t.post(who, URL, MOVE);
    expect([res.statusCode, res.json()]).toEqual([201, RESULT]);
    expect(t.m.checker.check).toHaveBeenCalledWith(
      expect.objectContaining({ teacherId: T_NEW, excludeIds: ['l9'] }),
    );
    const payload = t.m.writer.apply.mock.calls[0]?.[0].payload;
    expect(payload.new_rules.map((r: NewRule) => r.teacher_id)).toEqual([T_NEW, T_NEW]);
    expect(payload.audit.after.teacher).toEqual({ from: T_OLD, to: T_NEW });
    expect(t.m.repo.assignTeacher).toHaveBeenCalledWith({
      studentId: S1,
      from: T_OLD,
      to: T_NEW,
      actorId: actor,
      subscriptionId: SUB_ID,
    });
    expect(t.m.queries.teacherLink).toHaveBeenCalledWith(T_NEW);
  });

  it("the check answers the new teacher's clashes and the remaining count, nothing written", async () => {
    const res = await t.post('sales', `${URL}/check`, MOVE);
    expect([res.statusCode, res.json().remaining]).toEqual([200, 8]);
    expect(t.m.writer.apply).not.toHaveBeenCalled();
    expect(t.m.repo.assignTeacher).not.toHaveBeenCalled();
  });

  it('the new teacher is busy: 409 conflict, the teacher stays', async () => {
    t.m.checker.check.mockResolvedValue([
      {
        kind: 'teacher_lesson',
        startsAt: '2026-10-27T16:30:00.000Z',
        endsAt: '2026-10-27T17:15:00.000Z',
      },
    ]);
    const res = await t.post('sales', URL, MOVE);
    expect([res.statusCode, res.json().code]).toEqual([409, 'conflict']);
    expect(t.m.repo.assignTeacher).not.toHaveBeenCalled();
  });

  it('404 teacher_not_found, 409 teacher_inactive, 400 same_teacher, 400 without a teacher', async () => {
    t.m.repo.teacher.mockResolvedValueOnce(null);
    expect((await t.post('sales', URL, MOVE)).json().code).toBe('teacher_not_found');
    t.m.repo.teacher.mockResolvedValueOnce({ id: T_NEW, status: 'inactive' });
    expect((await t.post('sales', URL, MOVE)).json().code).toBe('teacher_inactive');
    t.m.repo.teacher.mockResolvedValueOnce({ id: T_OLD, status: 'active' });
    const same = await t.post('sales', URL, MOVE);
    expect([same.statusCode, same.json().code]).toEqual([400, 'same_teacher']);
    expect((await t.post('sales', URL, BODY)).statusCode).toBe(400);
    expect(t.m.writer.apply).not.toHaveBeenCalled();
  });

  it('a double submit: the first change comes back and the teacher is not assigned twice', async () => {
    t.m.writer.replay.mockResolvedValue(RESULT);
    t.m.repo.studentTeacher.mockResolvedValue(T_NEW);
    const res = await t.post('sales', URL, MOVE);
    expect([res.statusCode, res.json()]).toEqual([201, RESULT]);
    expect(t.m.writer.apply).not.toHaveBeenCalled();
    expect(t.m.repo.assignTeacher).not.toHaveBeenCalled();
  });

  it("GET teachers lists the student's options (the booking wizard's filter)", async () => {
    t.m.options.list.mockResolvedValue([{ id: T_NEW }]);
    const res = await t.get('sales', `/students/${S1}/course-teacher/teachers`);
    expect([res.statusCode, res.json()]).toEqual([200, [{ id: T_NEW }]]);
    expect(t.m.options.list).toHaveBeenCalledWith({ studentId: S1 });
  });
});
