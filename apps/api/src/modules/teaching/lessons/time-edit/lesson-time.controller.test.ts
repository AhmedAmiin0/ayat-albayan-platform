import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { conflict } from '../../../../common/http/errors';
import { LESSON_ID, lessonRow } from '../lessons.fakes';
import { lessonsApp } from '../test-app';

type Harness = Awaited<ReturnType<typeof lessonsApp>>;
const url = `/lessons/${LESSON_ID}/time`;
const BODY = { expectedStartsAt: '2026-10-04T14:00:00Z', startsAt: '2026-10-05T14:00:00+00:00', durationMin: 45 };
const HELD = { status: 'completed' as const, starts_at: '2026-10-01T14:00:00+00:00', ends_at: '2026-10-01T14:45:00+00:00' };
const CLASH = { kind: 'student_busy', startsAt: '2026-10-05T14:00:00.000Z', endsAt: '2026-10-05T14:45:00.000Z', studentId: 's1' };

describe('PATCH /lessons/:id/time — «عدّل الوقت» (docs/10 route 22, R-SCH-11)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await lessonsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    vi.useFakeTimers({ now: new Date('2026-10-02T10:00:00Z'), toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  it('200 with { lesson, notified, payout, pdf_refresh }; the lesson is read back by id as the admin', async () => {
    const res = await h.call({ method: 'PATCH', url, body: BODY });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      lesson: { id: LESSON_ID, time_edit_mode: 'move' },
      notified: 1,
      payout: 'none',
      pdf_refresh: false,
    });
    expect(h.writer.retime).toHaveBeenCalledTimes(1);
    expect(h.writer.apply).not.toHaveBeenCalled();
    expect(h.lessons.get).toHaveBeenLastCalledWith(LESSON_ID);
  });

  it('a held lesson: correction with a reason → pdf_refresh true, a draft payout is flagged stale', async () => {
    h.lessons.get.mockResolvedValue(lessonRow(HELD));
    h.time.payoutStatus.mockResolvedValue('draft');
    const body = { expectedStartsAt: HELD.starts_at.replace('+00:00', 'Z'), startsAt: '2026-10-01T14:00:00Z', durationMin: 60, reason: 'الحلقة خدت ساعة' };
    const res = await h.call({ method: 'PATCH', url, body });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ notified: 0, payout: 'draft_stale', pdf_refresh: true });
  });

  it('admin only: a teacher and a guardian get 403, nothing is written', async () => {
    for (const token of ['teacher', 'guardian'] as const) {
      expect((await h.call({ method: 'PATCH', url, token, body: BODY })).statusCode).toBe(403);
    }
    expect(h.writer.retime).not.toHaveBeenCalled();
  });

  it('400 for a bad body (free-text time, odd duration, long reason) or a bad id; 404 for an unknown lesson', async () => {
    for (const bad of [{ ...BODY, startsAt: '17:00' }, { ...BODY, durationMin: 50 }, { ...BODY, reason: 'x'.repeat(301) }, {}]) {
      expect((await h.call({ method: 'PATCH', url, body: bad })).statusCode).toBe(400);
    }
    expect((await h.call({ method: 'PATCH', url: '/lessons/nope/time', body: BODY })).statusCode).toBe(400);
    h.lessons.get.mockResolvedValue(null);
    expect((await h.call({ method: 'PATCH', url, body: BODY })).statusCode).toBe(404);
  });

  it('409 bodies: conflict (same as reschedule), time_edit_not_allowed, stale_time, payout_locked', async () => {
    h.checker.check.mockResolvedValue([CLASH]);
    const clash = await h.call({ method: 'PATCH', url, body: BODY });
    expect(clash.statusCode).toBe(409);
    expect(clash.json()).toEqual({ code: 'conflict', message: 'conflict', conflicts: [CLASH] });
    h.checker.check.mockResolvedValue([]);

    h.lessons.get.mockResolvedValue(lessonRow({ status: 'cancelled_by_admin' }));
    expect((await h.call({ method: 'PATCH', url, body: BODY })).json()).toEqual({
      code: 'time_edit_not_allowed',
      message: 'time_edit_not_allowed',
      status: 'cancelled_by_admin',
    });

    h.lessons.get.mockResolvedValue(lessonRow());
    const stale = await h.call({ method: 'PATCH', url, body: { ...BODY, expectedStartsAt: '2026-10-04T13:00:00Z' } });
    expect(stale.json()).toMatchObject({ code: 'stale_time', starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:45:00.000Z' });

    h.time.payoutStatus.mockResolvedValue('paid');
    expect((await h.call({ method: 'PATCH', url, body: BODY })).json()).toEqual({
      code: 'payout_locked',
      message: 'payout_locked',
      month: '2026-10',
      status: 'paid',
    });
    expect(h.writer.retime).not.toHaveBeenCalled();
  });

  it('a lost race in the RPC (stale_time) and a taken generated slot map to 409 too', async () => {
    h.writer.retime.mockRejectedValueOnce(conflict('stale_time'));
    expect((await h.call({ method: 'PATCH', url, body: BODY })).json()).toEqual({ code: 'stale_time', message: 'stale_time' });
    h.writer.retime.mockRejectedValueOnce(conflict('slot_taken'));
    expect((await h.call({ method: 'PATCH', url, body: BODY })).json()).toEqual({ code: 'slot_taken', message: 'slot_taken' });
  });
});
