import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LESSON, lessonFacts, studentsApp } from '@/modules/sales/sales-students/sales-students.fakes';

// «تصحيح الحالة» from the assistant (owner 2026-11-03): key lessons.cancel, after the end, through
// the admin's OutcomeCorrection (which decides whether the lesson may still be corrected).
type App = Awaited<ReturnType<typeof studentsApp>>;
const NOW = new Date('2026-10-27T10:00:00Z');
const ENDED = lessonFacts({ starts_at: '2026-10-26T15:00:00Z', ends_at: '2026-10-26T15:30:00Z' });

describe('POST /sales/lessons/:id/correct', () => {
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

  it('each target after the end goes to OutcomeCorrection with her as the actor', async () => {
    t.queries.lesson.mockResolvedValue(ENDED);
    for (const to of ['completed', 'no_show', 'excused', 'cancelled_by_teacher'] as const) {
      const res = await t.call('POST', `/sales/lessons/${LESSON}/correct`, { token: 'salesA', body: { to } });
      expect([res.statusCode, res.json()]).toEqual([200, { id: LESSON, status: to }]);
      expect(t.lessons.corrections.correct).toHaveBeenLastCalledWith(
        expect.objectContaining({ lessonId: LESSON, to }),
      );
    }
  });

  it('a bad body: 400, nothing corrected', async () => {
    t.queries.lesson.mockResolvedValue(ENDED);
    for (const body of [{}, { to: 'late' }, { to: 'completed', by: 'teacher' }]) {
      const res = await t.call('POST', `/sales/lessons/${LESSON}/correct`, { token: 'salesA', body });
      expect(res.statusCode).toBe(400);
    }
    expect(t.lessons.corrections.correct).not.toHaveBeenCalled();
  });

  it('the teacher and the classroom assistant may not (403)', async () => {
    for (const token of ['teacher', 'assistant'] as const) {
      const res = await t.call('POST', `/sales/lessons/${LESSON}/correct`, { token, body: { to: 'no_show' } });
      expect(res.statusCode).toBe(403);
    }
  });
});
