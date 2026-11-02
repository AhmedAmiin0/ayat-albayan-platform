import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LESSON, lessonFacts, MINE, OTHER, studentsApp } from '@/modules/sales/sales-students/sales-students.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const NOW = new Date('2026-10-27T10:00:00Z');
const AT = '2026-11-02T15:00:00.000Z';
const ACTIONS = [['reschedule', { startsAt: AT }], ['cancel', { by: 'student', reason: 'سفر' }]] as const;

// Owner 2026-11-02: while «اشتراط التعيين» enforces (SalesOwnershipRule), only her students'.
describe('POST /sales/lessons/:id/reschedule and /cancel while the ownership rule enforces', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp({ sales_require_assignee: true, sales_auto_assign: true });
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    t.reset();
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  const call = (action: string, body: object, token: 'salesA' | 'salesB' = 'salesA') =>
    t.call('POST', `/sales/lessons/${LESSON}/${action}`, { token, body });

  it('her student\'s lesson: both reach the admin services', async () => {
    t.queries.lesson.mockImplementation(async (id: string) =>
      lessonFacts(id === LESSON ? {} : { id, starts_at: AT, ends_at: '2026-11-02T15:30:00.000Z' }));
    for (const [action, body] of ACTIONS) expect((await call(action, body)).statusCode).toBe(200);
    expect(t.lessons.cancels.cancel).toHaveBeenCalledWith(expect.objectContaining({
      lessonId: LESSON, body: { scope: 'one', by: 'student', reason: 'سفر' },
    }));
  });

  it('another family\'s lesson, or a group with another family\'s child: 403 not_your_student', async () => {
    for (const students of [[OTHER], [MINE, OTHER]]) {
      const lesson_students = students.map((id) => ({ student_id: id }));
      t.queries.lesson.mockResolvedValue(lessonFacts({ lesson_students }));
      for (const [action, body] of ACTIONS) {
        const res = await call(action, body);
        expect([action, res.statusCode, res.json().code]).toEqual([action, 403, 'not_your_student']);
      }
    }
    expect(t.lessons.one.reschedule).not.toHaveBeenCalled();
    expect(t.lessons.cancels.cancel).not.toHaveBeenCalled();
  });

  it('a salesperson who owns nothing is refused too', async () => {
    t.queries.lesson.mockResolvedValue(lessonFacts());
    expect((await call('cancel', {}, 'salesB')).statusCode).toBe(403);
    expect(t.lessons.cancels.cancel).not.toHaveBeenCalled();
  });
});
