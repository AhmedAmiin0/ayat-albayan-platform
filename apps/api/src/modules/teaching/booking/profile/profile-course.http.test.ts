import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { BODY, profileApp, RESULT, S1, SALES, SUB_ID, T_NEW } from './profile-course.fakes';

// «تغيير موعد الحلقات» / «تغيير المعلم» from the student's profile (owner 2026-10-30): who may, and
// the codes.
type App = Awaited<ReturnType<typeof profileApp>>;
const TIMES = `/students/${S1}/course-times/change`;
const TEACHER = `/students/${S1}/course-teacher/change`;
const OTHER = 'c0000000-0000-4000-8000-0000000000ff';

describe('profile course changes: roles and routes', () => {
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

  it.each(['admin', 'sales'])(
    '%s changes the times of ANY student (no ownership): check 200, change 201',
    async (who) => {
      const check = await t.post(who, `${TIMES}/check`, BODY);
      expect([check.statusCode, check.json()]).toEqual([
        200,
        { conflicts: [], remaining: 8, endsOn: '2026-11-17' },
      ]);
      const res = await t.post(who, TIMES, BODY);
      expect([res.statusCode, res.json()]).toEqual([201, RESULT]);
      expect(t.m.repo.assignTeacher).not.toHaveBeenCalled();
    },
  );

  it.each(['teacher', 'guardian', 'assistant'])(
    '%s is refused 403 on every route; nothing written',
    async (who) => {
      for (const url of [TIMES, `${TIMES}/check`, TEACHER, `${TEACHER}/check`])
        expect((await t.post(who, url, { ...BODY, teacherId: T_NEW })).statusCode).toBe(403);
      expect((await t.get(who, `${TEACHER}?subscriptionId=${SUB_ID}`)).statusCode).toBe(403);
      expect((await t.get(who, `/students/${S1}/course-teacher/teachers`)).statusCode).toBe(403);
      expect(t.m.writer.apply).not.toHaveBeenCalled();
    },
  );

  it("another student's package is 404 subscription_not_found", async () => {
    const res = await t.post('sales', `/students/${OTHER}/course-times/change`, BODY);
    expect([res.statusCode, res.json().code]).toEqual([404, 'subscription_not_found']);
    expect(t.m.writer.apply).not.toHaveBeenCalled();
  });

  it('a clash: 409 conflict for sales (never an override); the admin books it with a reason', async () => {
    const clash = {
      kind: 'teacher_lesson',
      startsAt: '2026-10-27T16:30:00.000Z',
      endsAt: '2026-10-27T17:15:00.000Z',
    };
    t.m.checker.check.mockResolvedValue([clash]);
    const blocked = await t.post('sales', TIMES, BODY);
    expect([blocked.statusCode, blocked.json().code]).toEqual([409, 'conflict']);
    const forced = await t.post('sales', TIMES, { ...BODY, override: { reason: 'طلب الأسرة' } });
    expect([forced.statusCode, forced.json().code]).toEqual([403, 'override_not_allowed']);
    expect((await t.post('admin', TIMES, BODY)).statusCode).toBe(409);
    expect(
      (await t.post('admin', TIMES, { ...BODY, override: { reason: 'طلب الأسرة' } })).statusCode,
    ).toBe(201);
  });

  it('nothing left to move: 409 course_finished', async () => {
    const held = { status: 'completed', chargeable: true, makeup: false, instant: false };
    t.m.lessons.ofCourse.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({ ...held, id: `h${i}` })),
    );
    const res = await t.post('sales', TIMES, BODY);
    expect([res.statusCode, res.json().code]).toEqual([409, 'course_finished']);
  });

  it("a double submit returns the first change (the writer's replay), nothing new written", async () => {
    t.m.writer.replay.mockResolvedValue(RESULT);
    const res = await t.post('sales', TIMES, BODY);
    expect([res.statusCode, res.json()]).toEqual([201, RESULT]);
    expect(t.m.writer.apply).not.toHaveBeenCalled();
  });

  it("the view answers the course and «من تاريخ»'s default: the next lesson in the course zone", async () => {
    const res = await t.get('sales', `${TIMES}?subscriptionId=${SUB_ID}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().nextLesson).toEqual({
      startsOn: '2026-10-19',
      startsAt: '2026-10-19T14:00:00Z',
    });
    expect(res.json().student.id).toBe(S1);
  });

  it("the change's audit names the sales actor (change_course payload)", async () => {
    await t.post('sales', TIMES, BODY);
    const payload = t.m.writer.apply.mock.calls[0]?.[0].payload;
    expect(payload.actor).toBe(SALES);
    expect(payload.audit).toMatchObject({
      entity: 'subscriptions',
      action: 'course_change',
      after: { by: 'sales' },
    });
  });

  it("the view without subscriptionId resolves the student's current package", async () => {
    const res = await t.get('sales', `/students/${S1}/course-teacher/change`);
    expect(res.statusCode).toBe(200);
    expect(t.m.repo.currentSubscription).toHaveBeenCalledWith(S1);
    expect(t.m.views.view).toHaveBeenCalledWith(SUB_ID);
  });
});
