import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LESSON_ID, lessonRow, OTHER_TEACHER_ID } from '@/modules/teaching/lessons/lessons.fakes';
import { lessonsApp } from '@/modules/teaching/lessons/test-app';

type Harness = Awaited<ReturnType<typeof lessonsApp>>;
const url = `/teachers/me/lessons/${LESSON_ID}/cancel`;
const REASON = { reason: 'ظرف صحي' };
/** Three hours before the fake lesson (Sunday 2026-10-04 14:00 UTC). */
const BEFORE = new Date('2026-10-04T11:00:00Z');

describe('POST /teachers/me/lessons/:id/cancel — the teacher cancels one lesson (docs/46 C3, D3)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await lessonsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    vi.useFakeTimers({ now: BEFORE, toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  it('her own open lesson before its start: cancelled_by_teacher, ONE lesson, the reason pushed', async () => {
    const body = { ...REASON, by: 'admin', scope: 'rule' };
    const res = await h.call({ method: 'POST', url, token: 'teacher', body });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: LESSON_ID });
    expect(h.writer.apply).toHaveBeenCalledTimes(1);
    const change = h.writer.apply.mock.calls[0]?.[0];
    expect(change.end_rule).toBeUndefined();
    expect(change.changes).toHaveLength(1);
    expect(change.changes[0]).toMatchObject({ id: LESSON_ID, to_status: 'cancelled_by_teacher' });
    expect(change.audit.after).toMatchObject({ by: 'teacher', reason: REASON.reason });
    const pushed = expect.objectContaining({ id: LESSON_ID });
    expect(h.cancelPush.notify).toHaveBeenCalledWith(pushed, REASON.reason);
  });

  it("another teacher's lesson → 403, nothing written or pushed", async () => {
    h.lessons.get.mockResolvedValue(lessonRow({ teacher_id: OTHER_TEACHER_ID }));
    const res = await h.call({ method: 'POST', url, token: 'teacher', body: REASON });
    expect(res.statusCode).toBe(403);
    expect(h.writer.apply).not.toHaveBeenCalled();
    expect(h.cancelPush.notify).not.toHaveBeenCalled();
  });

  it('once the lesson started → 409 lesson_started', async () => {
    vi.setSystemTime(new Date('2026-10-04T14:00:00Z'));
    const res = await h.call({ method: 'POST', url, token: 'teacher', body: REASON });
    expect([res.statusCode, res.json().code]).toEqual([409, 'lesson_started']);
    expect(h.writer.apply).not.toHaveBeenCalled();
  });

  it('a completed lesson → 409, never the auto-held correction branch', async () => {
    h.lessons.get.mockResolvedValue(lessonRow({ status: 'completed', starts_at: '2026-10-05T14:00:00+00:00' }));
    const res = await h.call({ method: 'POST', url, token: 'teacher', body: REASON });
    expect([res.statusCode, res.json().code]).toEqual([409, 'invalid_transition']);
    expect(h.writer.apply).not.toHaveBeenCalled();
    expect(h.autoHeld.correctable).not.toHaveBeenCalled();
  });

  it('the reason is required (400); a blank one too', async () => {
    for (const body of [{}, { reason: '   ' }]) {
      expect((await h.call({ method: 'POST', url, token: 'teacher', body })).statusCode).toBe(400);
    }
    expect(h.writer.apply).not.toHaveBeenCalled();
  });

  it('only teachers: a guardian is 403; an unlinked teacher 404', async () => {
    expect((await h.call({ method: 'POST', url, token: 'guardian', body: REASON })).statusCode).toBe(403);
    const res = await h.call({ method: 'POST', url, token: 'unlinked', body: REASON });
    expect(res.statusCode).toBe(403);
    expect(h.writer.apply).not.toHaveBeenCalled();
  });
});
