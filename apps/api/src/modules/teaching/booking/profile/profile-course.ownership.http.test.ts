import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { REQUIRE_ON } from '@/modules/sales/sales/rule/sales-ownership-rule.fakes';
import { BODY, profileApp, RESULT, S1, SALES, SUB_ID, T_NEW } from './profile-course.fakes';

// «تعديل حجز الطالب» by an assistant (owner 2026-11-02): the profile's course routes follow THE
// ownership rule (SalesOwnershipRule): her own students only while it is enforced; the admin ANY.
type App = Awaited<ReturnType<typeof profileApp>>;
const TIMES = `/students/${S1}/course-times/change`;
const TEACHER = `/students/${S1}/course-teacher/change`;
const MINE = { leadIds: [], guardianIds: [], studentIds: [S1], phones: [] };

describe('profile course changes while «اشتراط التعيين» is ON', () => {
  let t: App;
  beforeAll(async () => {
    t = await profileApp(REQUIRE_ON);
  }, 60_000);
  afterAll(() => t.app.close());
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-10-18T08:00:00Z'), toFake: ['Date'] });
    t.reset();
  });

  it("another assistant's student: 403 not_your_student on every route; nothing written", async () => {
    for (const url of [TIMES, `${TIMES}/check`, TEACHER, `${TEACHER}/check`]) {
      const res = await t.post('sales', url, { ...BODY, teacherId: T_NEW });
      expect([url, res.statusCode, res.json().code]).toEqual([url, 403, 'not_your_student']);
    }
    const view = await t.get('sales', `${TIMES}?subscriptionId=${SUB_ID}`);
    expect([view.statusCode, view.json().code]).toEqual([403, 'not_your_student']);
    expect(t.m.writer.apply).not.toHaveBeenCalled();
    expect(t.m.repo.assignTeacher).not.toHaveBeenCalled();
    expect(t.m.sales.ownership).toHaveBeenCalledWith(SALES);
  });

  it('her own student: the times and the teacher change, she is the actor', async () => {
    t.m.sales.ownership.mockResolvedValue(MINE);
    expect((await t.get('sales', TIMES)).statusCode).toBe(200);
    expect((await t.post('sales', TIMES, BODY)).json()).toEqual(RESULT);
    const res = await t.post('sales', TEACHER, { ...BODY, teacherId: T_NEW });
    expect(res.statusCode).toBe(201);
    expect(t.m.repo.assignTeacher).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: S1, to: T_NEW, actorId: SALES }),
    );
  });

  it('the admin changes ANY student, the rule never asked', async () => {
    expect((await t.post('admin', TIMES, BODY)).statusCode).toBe(201);
    expect((await t.get('admin', TIMES)).statusCode).toBe(200);
    expect(t.m.sales.ownership).not.toHaveBeenCalled();
  });
});
