import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { A, LESSON, lessonFacts, MINE, OTHER, studentsApp } from '../sales-students.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const NOW = new Date('2026-10-27T10:00:00Z');
const MOVED = '1e000000-0000-4000-8000-0000000000c2';
const AT = '2026-11-02T15:00:00.000Z';

describe('POST /sales/lessons/:id/reschedule and /cancel (docs/16 row 37)', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    t.reset();
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    t.queries.lesson.mockImplementation(async (id: string) =>
      id === LESSON ? lessonFacts() : lessonFacts({ id, starts_at: AT, ends_at: '2026-11-02T15:30:00.000Z' }));
  });
  afterEach(() => vi.useRealTimers());

  it('reschedule: her student\'s lesson moves through the admin\'s one-lesson service, she is the actor', async () => {
    const res = await t.call('POST', `/sales/lessons/${LESSON}/reschedule`, { token: 'salesA', body: { startsAt: AT } });
    expect([res.statusCode, res.json()]).toEqual([200, { id: MOVED, starts_at: AT, status: 'scheduled' }]);
    expect(t.lessons.one.reschedule).toHaveBeenCalledWith({
      lessonId: LESSON, body: { scope: 'one', startsAt: AT }, actor: expect.objectContaining({ id: A, role: 'sales' }),
    });
  });

  it('cancel without a reason: one lesson, by the academy, reason null; a given reason is kept', async () => {
    t.queries.lesson.mockResolvedValueOnce(lessonFacts()).mockResolvedValueOnce(lessonFacts({ status: 'cancelled_by_admin' }));
    const res = await t.call('POST', `/sales/lessons/${LESSON}/cancel`, { token: 'salesA', body: {} });
    expect([res.statusCode, res.json()]).toEqual([200, { id: LESSON, status: 'cancelled_by_admin' }]);
    expect(t.lessons.cancels.cancel).toHaveBeenCalledWith({
      lessonId: LESSON, body: { scope: 'one', by: 'admin', reason: null }, actor: expect.objectContaining({ id: A, role: 'sales' }),
    });
    await t.call('POST', `/sales/lessons/${LESSON}/cancel`, { token: 'salesA', body: { reason: ' سفر ' } });
    expect(t.lessons.cancels.cancel).toHaveBeenLastCalledWith(expect.objectContaining({ body: { scope: 'one', by: 'admin', reason: 'سفر' } }));
  });

  it('a lesson of another family is 403 not_your_student; an unknown one 404; nothing is written', async () => {
    t.queries.lesson.mockResolvedValue(lessonFacts({ lesson_students: [{ student_id: OTHER }] }));
    for (const action of ['reschedule', 'cancel']) {
      const res = await t.call('POST', `/sales/lessons/${LESSON}/${action}`, { token: 'salesA', body: { startsAt: AT } });
      if (action === 'cancel') expect(res.statusCode).toBe(400); // strict body: no startsAt on a cancel
      const ok = await t.call('POST', `/sales/lessons/${LESSON}/${action}`, { token: 'salesA', body: action === 'cancel' ? {} : { startsAt: AT } });
      expect([action, ok.statusCode, ok.json().code]).toEqual([action, 403, 'not_your_student']);
    }
    t.queries.lesson.mockResolvedValue(null);
    expect((await t.call('POST', `/sales/lessons/${LESSON}/cancel`, { token: 'salesA', body: {} })).json().code).toBe('lesson_not_found');
    expect(t.lessons.one.reschedule).not.toHaveBeenCalled();
    expect(t.lessons.cancels.cancel).not.toHaveBeenCalled();
  });

  it('a group lesson with another family\'s child stays the admin\'s: 403, nothing moved or messaged', async () => {
    t.queries.lesson.mockResolvedValue(lessonFacts({ lesson_students: [{ student_id: MINE }, { student_id: OTHER }] }));
    for (const [action, body] of [['reschedule', { startsAt: AT }], ['cancel', {}]] as const) {
      const res = await t.call('POST', `/sales/lessons/${LESSON}/${action}`, { token: 'salesA', body });
      expect([action, res.statusCode, res.json().code]).toEqual([action, 403, 'not_your_student']);
    }
    expect(t.lessons.one.reschedule).not.toHaveBeenCalled();
    expect(t.lessons.cancels.cancel).not.toHaveBeenCalled();
  });

  it('a new time that has passed is 400 date_in_past (her booking refuses it too)', async () => {
    const res = await t.call('POST', `/sales/lessons/${LESSON}/reschedule`, { token: 'salesA', body: { startsAt: '2026-10-26T15:00:00.000Z' } });
    expect([res.statusCode, res.json().code]).toEqual([400, 'date_in_past']);
    expect(t.lessons.one.reschedule).not.toHaveBeenCalled();
  });

  it('never a series, a substitute, an override or a «by»: 400 before any read', async () => {
    const bad = [
      ['reschedule', { startsAt: AT, scope: 'rule' }],
      ['reschedule', { startsAt: AT, teacherId: MINE }],
      ['reschedule', { startsAt: AT, override: { reason: 'احجز' } }],
      ['reschedule', {}],
      ['cancel', { scope: 'rule' }],
      ['cancel', { by: 'student' }],
    ] as const;
    for (const [action, body] of bad) {
      expect([action, body, (await t.call('POST', `/sales/lessons/${LESSON}/${action}`, { token: 'salesA', body })).statusCode]).toEqual([action, body, 400]);
    }
    expect(t.queries.lesson).not.toHaveBeenCalled();
  });

  it('a lesson that has ended is hers to read, not to change: 409 lesson_ended', async () => {
    t.queries.lesson.mockResolvedValue(lessonFacts({ starts_at: '2026-10-26T15:00:00Z', ends_at: '2026-10-26T15:30:00Z' }));
    const res = await t.call('POST', `/sales/lessons/${LESSON}/cancel`, { token: 'salesA', body: {} });
    expect([res.statusCode, res.json().code]).toEqual([409, 'lesson_ended']);
    expect(t.lessons.cancels.cancel).not.toHaveBeenCalled();
  });

  it('teacher, classroom assistant and a salesperson without the key are refused (403)', async () => {
    for (const token of ['teacher', 'assistant'] as const) {
      expect((await t.call('POST', `/sales/lessons/${LESSON}/cancel`, { token, body: {} })).statusCode).toBe(403);
      expect((await t.call('POST', `/sales/lessons/${LESSON}/reschedule`, { token, body: { startsAt: AT } })).statusCode).toBe(403);
    }
    // salesB holds the keys but owns nothing: the scope refuses.
    expect((await t.call('POST', `/sales/lessons/${LESSON}/cancel`, { token: 'salesB', body: {} })).json().code).toBe('not_your_student');
  });
});
