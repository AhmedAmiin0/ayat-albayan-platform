import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { conflict } from '../scheduling/errors';
import { body, correction, heldRow, lessonRow, NOW, timeSetup } from './time-edit.fakes';

describe('LessonTimeService — replays and races (idempotency, rule 8)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('a replay (the lesson already has that start and length) is a 200 that writes nothing', async () => {
    // The first attempt succeeded: the row now holds the new time, the client retries with the old `expected`.
    const moved = lessonRow({ starts_at: '2026-10-05T14:00:00+00:00', ends_at: '2026-10-05T14:45:00+00:00' });
    const t = timeSetup(moved);
    const res = await t.run(body());
    expect(res).toEqual({ notified: 0, payout: 'none', pdf_refresh: false });
    expect(t.writer.retime).not.toHaveBeenCalled();
    expect(t.checker.check).not.toHaveBeenCalled();
    expect(t.queries.contacts).not.toHaveBeenCalled();
  });

  it('a correction replay writes nothing either (no second audit row, no second PDF refresh)', async () => {
    const done = heldRow({ ends_at: '2026-10-01T15:00:00+00:00' });
    const t = timeSetup(done);
    expect(await t.run(correction())).toMatchObject({ notified: 0, pdf_refresh: false });
    expect(t.writer.retime).not.toHaveBeenCalled();
    expect(t.record).not.toHaveBeenCalled();
  });

  it('a stale expectedStartsAt with a different request is 409 stale_time with the current times', async () => {
    const t = timeSetup();
    await expect(t.run(body({ expectedStartsAt: '2026-10-04T13:00:00.000Z' }))).rejects.toMatchObject({
      status: 409,
      response: { code: 'stale_time', message: 'stale_time', starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:45:00.000Z' },
    });
    expect(t.writer.retime).not.toHaveBeenCalled();
  });

  it('losing the race inside the transaction (the RPC raises stale_time) is the same 409', async () => {
    const t = timeSetup();
    t.writer.retime.mockRejectedValue(conflict('stale_time'));
    await expect(t.run(body())).rejects.toMatchObject({ status: 409, response: { code: 'stale_time' } });
  });

  it('landing on a slot another generated lesson of the rule holds is 409 slot_taken', async () => {
    const t = timeSetup();
    t.writer.retime.mockRejectedValue(conflict('slot_taken'));
    await expect(t.run(body())).rejects.toMatchObject({ status: 409, response: { code: 'slot_taken' } });
  });

  it('the checks run before any write: a clash, a locked payout or a bad request leaves the writer untouched', async () => {
    const t = timeSetup();
    t.checker.check.mockResolvedValue([{ kind: 'teacher_busy', startsAt: 'a', endsAt: 'b' }]);
    await expect(t.run(body())).rejects.toBeTruthy();
    expect(t.writer.retime).not.toHaveBeenCalled();
    expect(t.record).not.toHaveBeenCalled();
  });
});
