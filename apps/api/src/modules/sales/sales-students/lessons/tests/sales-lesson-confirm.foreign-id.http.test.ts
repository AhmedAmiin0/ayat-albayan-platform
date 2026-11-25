import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LESSON, studentsApp } from '@/modules/sales/sales-students/sales-students.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const NOW = new Date('2026-10-27T10:00:00Z');
const CONFIRM = `/sales/lessons/${LESSON}/confirm`;

// A family's yes arrives in a chat every assistant sees, so any salesperson confirms any lesson
// (docs/16 row 37b); the denial is for every other login and for a lesson that does not exist.
describe('POST /sales/lessons/:id/confirm with someone else\'s lesson id', () => {
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

  it('a teacher or guardian is 403 and nothing is confirmed', async () => {
    for (const token of ['teacher', 'guardian'] as const) {
      expect([token, (await t.call('POST', CONFIRM, { token })).statusCode]).toEqual([token, 403]);
    }
    expect(t.queries.lesson).not.toHaveBeenCalled();
    expect(t.lessons.status.confirm).not.toHaveBeenCalled();
  });

  it('an unknown lesson id is 404 lesson_not_found and nothing is confirmed', async () => {
    t.queries.lesson.mockResolvedValue(null);
    const res = await t.call('POST', CONFIRM, { token: 'salesB' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'lesson_not_found']);
    expect(t.lessons.status.confirm).not.toHaveBeenCalled();
  });
});
