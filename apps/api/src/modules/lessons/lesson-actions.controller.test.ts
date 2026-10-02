import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LESSON_ID, lessonRow, OTHER_TEACHER_ID } from './lessons.fakes';
import { lessonsApp } from './test-app';

type Harness = Awaited<ReturnType<typeof lessonsApp>>;
const url = (action: string, id = LESSON_ID) => `/lessons/${id}/${action}`;

describe('POST /lessons/:id/confirm|status|cancel — roles and ownership (R-SCH-03, R-SCH-08, rule 9)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await lessonsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    vi.useFakeTimers({ now: new Date('2026-10-04T15:00:00Z'), toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  it('a teacher confirms their own lesson → 200 view with teacher-only actions', async () => {
    const res = await h.call({ method: 'POST', url: url('confirm'), token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(h.writer.apply).toHaveBeenCalledTimes(1);
    expect(res.json()).toMatchObject({ id: LESSON_ID, starts_at: '2026-10-04T14:00:00.000Z' });
    expect(res.json().allowed_events).not.toContain('cancel_by_admin');
  });

  it("a teacher touching another teacher's lesson → 403, nothing written", async () => {
    h.lessons.get.mockResolvedValue(lessonRow({ teacher_id: OTHER_TEACHER_ID }));
    for (const [action, body] of [['confirm', undefined], ['status', { event: 'complete' }]] as const) {
      const res = await h.call({ method: 'POST', url: url(action), token: 'teacher', body });
      expect(res.statusCode).toBe(403);
    }
    expect(h.writer.apply).not.toHaveBeenCalled();
  });

  it('a teacher login without a teachers row, or a guardian → 403', async () => {
    expect((await h.call({ method: 'POST', url: url('confirm'), token: 'unlinked' })).statusCode).toBe(403);
    expect((await h.call({ method: 'POST', url: url('confirm'), token: 'guardian' })).statusCode).toBe(403);
    expect(h.writer.apply).not.toHaveBeenCalled();
  });

  it('cancel is admin-only: a teacher gets 403 even on their own lesson', async () => {
    const body = { scope: 'one', by: 'teacher', reason: 'مريضة' };
    expect((await h.call({ method: 'POST', url: url('cancel'), token: 'teacher', body })).statusCode).toBe(403);
    const res = await h.call({ method: 'POST', url: url('cancel'), body });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it('status: a teacher records an outcome on their own lesson; admins too', async () => {
    const res = await h.call({ method: 'POST', url: url('status'), token: 'teacher', body: { event: 'complete' } });
    expect(res.statusCode).toBe(200);
    expect(h.writer.apply.mock.calls[0]?.[0].changes[0]).toMatchObject({ to_status: 'completed', attendance: 'on_time' });
  });

  it('status accepts only attendance events (400) and maps domain errors to 409 bodies', async () => {
    const bad = await h.call({ method: 'POST', url: url('status'), body: { event: 'cancel_by_admin' } });
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toMatchObject({ message: 'validation_failed' });
    h.lessons.get.mockResolvedValue(lessonRow({ status: 'completed' }));
    const done = await h.call({ method: 'POST', url: url('status'), body: { event: 'mark_late' } });
    expect(done.statusCode).toBe(409);
    expect(done.json()).toEqual({ code: 'invalid_transition', message: 'invalid_transition', from: 'completed', event: 'mark_late' });
  });

  it('409 not_started for an outcome before the lesson starts', async () => {
    h.lessons.get.mockResolvedValue(lessonRow({ starts_at: '2026-10-05T14:00:00+00:00', ends_at: '2026-10-05T14:45:00+00:00' }));
    const res = await h.call({ method: 'POST', url: url('status'), body: { event: 'mark_no_show' } });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ code: 'not_started', message: 'not_started' });
  });

  it('404 for an unknown lesson, 400 for a non-uuid id or a cancel without a reason', async () => {
    h.lessons.get.mockResolvedValue(null);
    expect((await h.call({ method: 'POST', url: url('confirm') })).statusCode).toBe(404);
    expect((await h.call({ method: 'POST', url: url('confirm', 'nope') })).statusCode).toBe(400);
    const res = await h.call({ method: 'POST', url: url('cancel'), body: { scope: 'one', by: 'admin', reason: ' ' } });
    expect(res.statusCode).toBe(400);
  });
});
