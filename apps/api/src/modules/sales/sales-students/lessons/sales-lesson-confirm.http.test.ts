import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { A, LESSON, lessonFacts, OTHER, studentsApp } from '../sales-students.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const NOW = new Date('2026-10-27T10:00:00Z');
const STARTS = '2026-11-01T15:00:00.000Z';
const confirmUrl = `/sales/lessons/${LESSON}/confirm`;

describe('POST /sales/lessons/:id/confirm «تأكيد الحلقة» (owner 2026-10-28, docs/16 row 37)', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    t.reset();
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  it('ANY lesson (here another family\'s) confirms through LessonStatusService, she is the actor, any lesson', async () => {
    t.queries.lesson.mockResolvedValue(lessonFacts({ lesson_students: [{ student_id: OTHER }] }));
    const res = await t.call('POST', confirmUrl, { token: 'salesA' });
    expect([res.statusCode, res.json()]).toEqual([200, { id: LESSON, starts_at: STARTS, status: 'confirmed' }]);
    expect(t.lessons.status.confirm).toHaveBeenCalledWith({ lessonId: LESSON, actor: expect.objectContaining({ id: A, role: 'sales' }), anyLesson: true });
    expect(t.sales.ownership).not.toHaveBeenCalled();
  });

  it('salesB (owns nothing) confirms too: no ownership scope on a confirm', async () => {
    expect((await t.call('POST', confirmUrl, { token: 'salesB' })).statusCode).toBe(200);
  });

  it('an unknown lesson is 404 lesson_not_found; nothing is written', async () => {
    t.queries.lesson.mockResolvedValue(null);
    const res = await t.call('POST', confirmUrl, { token: 'salesA' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'lesson_not_found']);
    expect(t.lessons.status.confirm).not.toHaveBeenCalled();
  });

  it('a lesson that has ended is 409 lesson_ended; nothing is written', async () => {
    t.queries.lesson.mockResolvedValue(lessonFacts({ starts_at: '2026-10-26T15:00:00Z', ends_at: '2026-10-26T15:30:00Z' }));
    const res = await t.call('POST', confirmUrl, { token: 'salesA' });
    expect([res.statusCode, res.json().code]).toEqual([409, 'lesson_ended']);
    expect(t.lessons.status.confirm).not.toHaveBeenCalled();
  });

  it('teacher and classroom assistant (no lessons.confirm) are refused 403', async () => {
    for (const token of ['teacher', 'assistant'] as const) {
      expect([token, (await t.call('POST', confirmUrl, { token })).statusCode]).toEqual([token, 403]);
    }
    expect(t.lessons.status.confirm).not.toHaveBeenCalled();
  });

  it('the teacher route is unchanged: sales still cannot use POST /lessons/:id/confirm (lessons.status)', async () => {
    expect((await t.call('POST', `/lessons/${LESSON}/confirm`, { token: 'salesA' })).statusCode).toBe(403);
    expect(t.lessons.status.confirm).not.toHaveBeenCalled();
  });
});
