import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FamilyRequestService, LessonCancelService, LessonStatusService } from '@/modules/teaching/lessons';
import { L1, lessonRow, portalApp, S1, S3 } from './portal.fakes';

type App = Awaited<ReturnType<typeof portalApp>>;
const base = (student = S1) => `/portal/students/${student}/lessons/${L1}`;
const LATER = '2026-10-28T16:00:00.000Z';

// The family's buttons reuse the lesson services, scoped.
describe('POST /portal/students/:id/lessons/:lessonId/{confirm,cancel,request,withdraw}', () => {
  let t: App;
  const spies = { confirm: vi.fn(), cancel: vi.fn(), request: vi.fn(), withdraw: vi.fn() };
  const post = (url: string, who: string, payload?: object) =>
    t.app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${who}` }, ...(payload ? { payload } : {}) });

  beforeAll(async () => {
    t = await portalApp();
    vi.spyOn(t.app.get(LessonStatusService), 'confirm').mockImplementation(spies.confirm);
    vi.spyOn(t.app.get(LessonCancelService), 'cancel').mockImplementation(spies.cancel);
    vi.spyOn(t.app.get(FamilyRequestService), 'request').mockImplementation(spies.request);
    vi.spyOn(t.app.get(FamilyRequestService), 'withdraw').mockImplementation(spies.withdraw);
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    Object.values(spies).forEach((s) => s.mockReset());
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-25T08:00:00.000Z'));
    t.lessons.one.mockResolvedValue(lessonRow({ status: 'scheduled' }));
  });

  it('«سأحضر» confirms as the guardian, without the staff access rule', async () => {
    const res = await post(`${base()}/confirm`, 'guardianA');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ lesson_id: L1, status: 'scheduled', counts: false });
    expect(spies.confirm).toHaveBeenCalledWith({ lessonId: L1, actor: expect.objectContaining({ id: 'g-a' }), anyLesson: true });
  });

  it("«أعتذر» is the student's cancel of that one lesson, its reason optional", async () => {
    expect((await post(`${base()}/cancel`, 'student1', { reason: 'سفر' })).statusCode).toBe(200);
    expect(spies.cancel).toHaveBeenCalledWith(expect.objectContaining({ lessonId: L1, body: { scope: 'one', by: 'student', reason: 'سفر' } }));
    expect((await post(`${base()}/cancel`, 'student1')).statusCode).toBe(200);
    expect(spies.cancel).toHaveBeenLastCalledWith(expect.objectContaining({ body: { scope: 'one', by: 'student', reason: null } }));
  });

  it('«اطلب موعدًا آخر» / «سحب الطلب» go to FamilyRequestService; a bad time → 400', async () => {
    expect((await post(`${base()}/request`, 'guardianA', { startsAt: LATER, note: 'اختبار' })).statusCode).toBe(200);
    expect(spies.request).toHaveBeenCalledWith(expect.objectContaining({ lessonId: L1, body: { startsAt: LATER, note: 'اختبار' } }));
    expect((await post(`${base()}/request`, 'guardianA', { startsAt: '2026-10-28 16:00' })).statusCode).toBe(400);
    expect((await post(`${base()}/withdraw`, 'guardianA')).statusCode).toBe(200);
    expect(spies.withdraw).toHaveBeenCalledWith(L1, expect.objectContaining({ id: 'g-a' }));
  });

  it("another family's student → 404; a staff login → 403; a started lesson → 409; nothing done", async () => {
    expect((await post(`${base(S3)}/confirm`, 'guardianA')).statusCode).toBe(404);
    expect((await post(`${base()}/confirm`, 'admin')).statusCode).toBe(403);
    vi.setSystemTime(new Date('2026-10-27T16:10:00.000Z'));
    const late = await post(`${base()}/cancel`, 'guardianA');
    expect([late.statusCode, late.json().code]).toEqual([409, 'lesson_started']);
    expect(spies.confirm).not.toHaveBeenCalled();
    expect(spies.cancel).not.toHaveBeenCalled();
  });

  it('a group lesson → 409 group_lesson: the family never acts on the other students’ lesson', async () => {
    const group = [{ student_id: S1 }, { student_id: 'other-student' }];
    t.lessons.one.mockResolvedValue(lessonRow({ status: 'scheduled', lesson_students: group }));
    for (const action of ['confirm', 'cancel', 'withdraw']) {
      const res = await post(`${base()}/${action}`, 'guardianA');
      expect([res.statusCode, res.json().code]).toEqual([409, 'group_lesson']);
    }
    expect(spies.confirm).not.toHaveBeenCalled();
    expect(spies.cancel).not.toHaveBeenCalled();
    expect(spies.withdraw).not.toHaveBeenCalled();
  });
});
