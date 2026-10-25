import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEACHER_ID } from '../lessons.fakes';
import { body, correction, heldRow, NOW, retimed, timeSetup } from './time-edit.fakes';

describe('LessonTimeService — payout lock (E3, R-PAY-02)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it.each(['approved', 'paid'] as const)('a correction that re-prices a %s month is 409 payout_locked', async (locked) => {
    const t = timeSetup(heldRow());
    t.payouts.payoutStatus.mockResolvedValue(locked);
    await expect(t.run(correction())).rejects.toMatchObject({
      status: 409,
      response: { code: 'payout_locked', message: 'payout_locked', month: '2026-10', status: locked },
    });
    expect(t.payouts.payoutStatus).toHaveBeenCalledWith(TEACHER_ID, '2026-10');
    expect(t.writer.retime).not.toHaveBeenCalled();
  });

  it('a draft month is allowed: payout is draft_stale (press «احسب مستحقات الشهر» again)', async () => {
    const t = timeSetup(heldRow());
    t.payouts.payoutStatus.mockResolvedValue('draft');
    expect(await t.run(correction())).toMatchObject({ payout: 'draft_stale', pdf_refresh: true });
    expect(t.writer.retime).toHaveBeenCalledTimes(1);
  });

  it('no payout row yet: nothing stale', async () => {
    const t = timeSetup(heldRow());
    expect(await t.run(correction())).toMatchObject({ payout: 'none' });
  });

  it('a start-only shift on the same day does not change the line, even in an approved month', async () => {
    const t = timeSetup(heldRow());
    t.payouts.payoutStatus.mockResolvedValue('approved');
    const res = await t.run(correction({ startsAt: '2026-10-01T13:30:00.000Z', durationMin: 45 }));
    expect(t.payouts.payoutStatus).not.toHaveBeenCalled();
    expect(res.payout).toBe('none');
    expect(retimed(t.writer).refresh_pdf).toBe(true);
  });

  it('a late lesson counts only when the owner pays late lessons (payout_count_late)', async () => {
    const off = timeSetup(heldRow({ status: 'late' }));
    off.payouts.payoutStatus.mockResolvedValue('approved');
    await off.run(correction());
    expect(off.writer.retime).toHaveBeenCalledTimes(1);
    const on = timeSetup(heldRow({ status: 'late' }), { payout_count_late: true });
    on.payouts.payoutStatus.mockResolvedValue('approved');
    await expect(on.run(correction())).rejects.toMatchObject({ response: { code: 'payout_locked' } });
  });

  it('a move into a locked month is 409 payout_locked: the lesson could never be paid there', async () => {
    const t = timeSetup();
    t.payouts.payoutStatus.mockResolvedValue('approved');
    await expect(t.run(body({ startsAt: '2026-11-03T14:00:00.000Z' }))).rejects.toMatchObject({
      status: 409,
      response: { code: 'payout_locked', month: '2026-11', status: 'approved' },
    });
    expect(t.payouts.payoutStatus).toHaveBeenCalledWith(TEACHER_ID, '2026-11');
  });

  it('the month of a move is the new start in the TEACHER tz: 22:30Z on the 31st is November in Cairo (UTC+2 after DST ends)', async () => {
    const t = timeSetup();
    await t.run(body({ startsAt: '2026-10-31T22:30:00.000Z' }));
    expect(t.payouts.payoutStatus).toHaveBeenCalledWith(TEACHER_ID, '2026-11');
  });

  it('a move into a draft month is allowed and is not flagged stale (an open lesson is not paid yet)', async () => {
    const t = timeSetup();
    t.payouts.payoutStatus.mockResolvedValue('draft');
    expect(await t.run(body())).toMatchObject({ payout: 'none' });
  });

  it('the settings are only read for a correction', async () => {
    const t = timeSetup();
    await t.run(body());
    expect(t.settings.all).not.toHaveBeenCalled();
  });
});
