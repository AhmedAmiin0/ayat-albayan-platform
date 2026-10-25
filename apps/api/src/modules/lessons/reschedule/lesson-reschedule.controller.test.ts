import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { conflict } from '../../../common/http/errors';
import { RULE_ID } from '../../scheduling/scheduling.fakes';
import { LESSON_ID, TEACHER_ID } from '../lessons.fakes';
import { lessonsApp } from '../test-app';

type Harness = Awaited<ReturnType<typeof lessonsApp>>;
const ONE = { scope: 'one', startsAt: '2026-10-05T17:00:00+03:00' };
const RULE = {
  scope: 'rule',
  newRule: { teacherId: TEACHER_ID, byday: [1, 3], startTimeLocal: '18:30', tz: 'Asia/Riyadh', durationMin: 60, startsOn: '2026-10-12' },
};
const CLASH = { kind: 'outside_availability', startsAt: '2026-10-05T14:00:00.000Z', endsAt: '2026-10-05T14:45:00.000Z' };

describe('POST /lessons/:id/reschedule and /schedule-rules/:id/cancel (R-SCH-07)', () => {
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

  it('one occurrence → 200 with the new lesson (same rule, linked to the old one)', async () => {
    const res = await h.call({ method: 'POST', url: `/lessons/${LESSON_ID}/reschedule`, body: ONE });
    expect(res.statusCode).toBe(200);
    const newId = h.writer.apply.mock.calls[0]?.[0].lessons[0].id;
    expect(h.lessons.get).toHaveBeenLastCalledWith(newId);
  });

  it('a clash → 409 { code: conflict, conflicts } (ConflictResponse); a taken slot → 409 slot_taken', async () => {
    h.checker.check.mockResolvedValue([CLASH]);
    const res = await h.call({ method: 'POST', url: `/lessons/${LESSON_ID}/reschedule`, body: ONE });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ code: 'conflict', message: 'conflict', conflicts: [CLASH] });
    h.checker.check.mockResolvedValue([]);
    h.writer.apply.mockRejectedValue(conflict('slot_taken'));
    const taken = await h.call({ method: 'POST', url: `/lessons/${LESSON_ID}/reschedule`, body: ONE });
    expect(taken.json()).toEqual({ code: 'slot_taken', message: 'slot_taken' });
  });

  it('whole rule → 200 with the first lesson of the new rule', async () => {
    const res = await h.call({ method: 'POST', url: `/lessons/${LESSON_ID}/reschedule`, body: RULE });
    expect(res.statusCode).toBe(200);
    const change = h.writer.apply.mock.calls[0]?.[0];
    expect(change.end_rule).toEqual({ id: RULE_ID, ends_on: '2026-10-03' }); // the day before the tapped lesson
    expect(h.lessons.get).toHaveBeenLastCalledWith(change.lessons[0].id);
  });

  it('admin only, and the body must be one of the two scopes', async () => {
    expect((await h.call({ method: 'POST', url: `/lessons/${LESSON_ID}/reschedule`, token: 'teacher', body: ONE })).statusCode).toBe(403);
    const bad = await h.call({ method: 'POST', url: `/lessons/${LESSON_ID}/reschedule`, body: { scope: 'all' } });
    expect(bad.statusCode).toBe(400);
    expect(h.writer.apply).not.toHaveBeenCalled();
  });

  it('rule cancel → { rule_id, cancelled: LessonView[] }; admin only; 409 for an ended rule', async () => {
    h.lessons.openOfRule.mockResolvedValue([{ id: 'l2', status: 'scheduled', starts_at: '2026-10-06T14:00:00Z' }]);
    const body = { by: 'admin', reason: 'انسحب', from: '2026-10-05' };
    const res = await h.call({ method: 'POST', url: `/schedule-rules/${RULE_ID}/cancel`, body });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ rule_id: RULE_ID, cancelled: [{ id: 'l2' }] });
    expect((await h.call({ method: 'POST', url: `/schedule-rules/${RULE_ID}/cancel`, token: 'teacher', body })).statusCode).toBe(403);
    h.rules.rule.mockResolvedValue(null);
    expect((await h.call({ method: 'POST', url: `/schedule-rules/${RULE_ID}/cancel`, body })).statusCode).toBe(404);
  });
});
