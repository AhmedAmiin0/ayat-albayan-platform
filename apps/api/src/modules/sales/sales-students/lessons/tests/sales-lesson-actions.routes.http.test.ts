import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LESSON, lessonFacts, studentsApp } from '@/modules/sales/sales-students/sales-students.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const NOW = new Date('2026-10-27T10:00:00Z');
const ACTIONS = ['reschedule', 'cancel', 'confirm', 'correct'] as const;

describe('POST /sales/lessons/:id/* served from their route objects', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp({ sales_require_assignee: false });
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    t.reset();
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  it.each(ACTIONS)('%s: a malformed :id answers the validation_failed envelope', async (action) => {
    const res = await t.call('POST', `/sales/lessons/nope/${action}`, { token: 'salesA', body: {} });
    expect([res.statusCode, res.json<{ message: string }>().message]).toEqual([
      400,
      'validation_failed',
    ]);
    expect(t.queries.lesson).not.toHaveBeenCalled();
  });

  it('cancel without a JSON body cancels with no reason', async () => {
    t.queries.lesson.mockResolvedValueOnce(lessonFacts());
    t.queries.lesson.mockResolvedValueOnce(lessonFacts({ status: 'cancelled_by_admin' }));
    const res = await t.call('POST', `/sales/lessons/${LESSON}/cancel`, { token: 'salesA' });
    expect([res.statusCode, res.json()]).toEqual([200, { id: LESSON, status: 'cancelled_by_admin' }]);
    const body = { scope: 'one', by: 'admin', reason: null };
    expect(t.lessons.cancels.cancel).toHaveBeenCalledWith(expect.objectContaining({ body }));
  });
});
