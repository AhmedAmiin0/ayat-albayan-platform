import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LESSON, lessonFacts, studentsApp } from '@/modules/sales/sales-students/sales-students.fakes';

// «ألغاها المعلم/ة» / «اعتذر الطالب» from the assistant (owner 2026-11-02): same key
// lessons.cancel, before or after the lesson ends; the academy's own cancel stays before the end.
type App = Awaited<ReturnType<typeof studentsApp>>;
const NOW = new Date('2026-10-27T10:00:00Z');
const ENDED = lessonFacts({ starts_at: '2026-10-26T15:00:00Z', ends_at: '2026-10-26T15:30:00Z' });

describe('POST /sales/lessons/:id/cancel with «by»', () => {
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

  it('by teacher / student after the end: through the admin service (which corrects an auto-held one)', async () => {
    for (const [by, status] of [
      ['teacher', 'cancelled_by_teacher'],
      ['student', 'excused'],
    ] as const) {
      t.queries.lesson
        .mockReset()
        .mockResolvedValueOnce(ENDED)
        .mockResolvedValueOnce(lessonFacts({ status }));
      const res = await t.call('POST', `/sales/lessons/${LESSON}/cancel`, {
        token: 'salesA',
        body: { by },
      });
      expect([res.statusCode, res.json()]).toEqual([200, { id: LESSON, status }]);
      expect(t.lessons.cancels.cancel).toHaveBeenLastCalledWith(
        expect.objectContaining({
          lessonId: LESSON,
          body: { scope: 'one', by, reason: null },
        }),
      );
    }
  });

  it('by admin (or no by) after the end: 409 lesson_ended, as before', async () => {
    t.queries.lesson.mockResolvedValue(ENDED);
    for (const body of [{}, { by: 'admin' }]) {
      const res = await t.call('POST', `/sales/lessons/${LESSON}/cancel`, {
        token: 'salesA',
        body,
      });
      expect([res.statusCode, res.json().code]).toEqual([409, 'lesson_ended']);
    }
    expect(t.lessons.cancels.cancel).not.toHaveBeenCalled();
  });

  it('the teacher and the classroom assistant still may not (403)', async () => {
    for (const token of ['teacher', 'assistant'] as const) {
      const res = await t.call('POST', `/sales/lessons/${LESSON}/cancel`, {
        token,
        body: { by: 'teacher' },
      });
      expect(res.statusCode).toBe(403);
    }
  });
});
