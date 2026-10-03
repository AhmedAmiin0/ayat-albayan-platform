import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN, LESSON_ID } from './lessons.fakes';
import { CLASH, correction, heldRow, NOW, retimed, timeSetup } from './time-edit.fakes';

describe('LessonTimeService — correct a held lesson (R-SCH-11)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('completed, ran 60 not 45: same row, new end, PDF refresh, audited with the reason, no notice', async () => {
    const { run, writer, record } = timeSetup(heldRow());
    const res = await run(correction());
    expect(writer.apply).not.toHaveBeenCalled(); // status, attendance and chargeable are frozen: no change set
    expect(retimed(writer)).toEqual({
      actor: ADMIN.id,
      lesson_id: LESSON_ID,
      from: { status: 'completed', starts_at: '2026-10-01T14:00:00.000Z', ends_at: '2026-10-01T14:45:00.000Z' },
      to: { starts_at: '2026-10-01T14:00:00.000Z', ends_at: '2026-10-01T15:00:00.000Z' },
      reason: 'الحلقة خدت ساعة بدل 45 دقيقة',
      override_reason: null,
      retime_open: false,
      refresh_pdf: true,
      messages: [],
      audit: expect.objectContaining({ action: 'time_edit' }),
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        before: { starts_at: '2026-10-01T14:00:00.000Z', ends_at: '2026-10-01T14:45:00.000Z' },
        after: expect.objectContaining({ ends_at: '2026-10-01T15:00:00.000Z', reason: 'الحلقة خدت ساعة بدل 45 دقيقة', mode: 'correct', notified: 0 }),
      }),
    );
    expect(res).toMatchObject({ notified: 0, pdf_refresh: true });
  });

  it('a late lesson is corrected the same way; a corrected start on the same day works', async () => {
    const { run, writer } = timeSetup(heldRow({ status: 'late' }));
    await run(correction({ startsAt: '2026-10-01T13:45:00.000Z', durationMin: 45 }));
    expect(retimed(writer)).toMatchObject({
      from: { status: 'late' },
      to: { starts_at: '2026-10-01T13:45:00.000Z', ends_at: '2026-10-01T14:30:00.000Z' },
      refresh_pdf: true,
    });
  });

  it('notify is ignored: a guardian is never told about a correction', async () => {
    const { run, writer } = timeSetup(heldRow());
    const res = await run(correction({ notify: true }));
    expect(retimed(writer).messages).toEqual([]);
    expect(res.notified).toBe(0);
  });

  it('a reason is required (400 reason_required); a future time is 400 date_in_future', async () => {
    const t = timeSetup(heldRow());
    await expect(t.run(correction({ reason: undefined }))).rejects.toMatchObject({ status: 400, response: { code: 'reason_required' } });
    await expect(t.run(correction({ reason: '   ' }))).rejects.toMatchObject({ status: 400, response: { code: 'reason_required' } });
    await expect(t.run(correction({ startsAt: '2026-10-03T14:00:00.000Z' }))).rejects.toMatchObject({ status: 400, response: { code: 'date_in_future' } });
    expect(t.writer.retime).not.toHaveBeenCalled();
  });

  it('crossing the day for the teacher or a student is 400 correction_cross_day', async () => {
    const t = timeSetup(heldRow());
    // 21:30Z = 00:30 on the 2nd in Cairo and Riyadh
    await expect(t.run(correction({ startsAt: '2026-10-01T21:30:00.000Z', durationMin: 30 }))).rejects.toMatchObject({
      status: 400,
      response: { code: 'correction_cross_day' },
    });
    expect(t.writer.retime).not.toHaveBeenCalled();
  });

  it('only a teacher or student overlap blocks a correction; the weekly grid and time-off are ignored', async () => {
    const ignored = timeSetup(heldRow());
    ignored.checker.check.mockResolvedValue([
      { kind: 'outside_availability', startsAt: 'a', endsAt: 'b' },
      { kind: 'time_off', startsAt: 'a', endsAt: 'b' },
    ]);
    await ignored.run(correction());
    expect(ignored.writer.retime).toHaveBeenCalledTimes(1);
    const blocked = timeSetup(heldRow());
    blocked.checker.check.mockResolvedValue([{ kind: 'outside_availability', startsAt: 'a', endsAt: 'b' }, CLASH]);
    await expect(blocked.run(correction())).rejects.toMatchObject({ status: 409, response: { code: 'conflict', conflicts: [CLASH] } });
  });

  it('excused and no_show lessons stay closed to time edits', async () => {
    for (const status of ['excused', 'no_show'] as const) {
      const t = timeSetup(heldRow({ status }));
      await expect(t.run(correction())).rejects.toMatchObject({ status: 409, response: { code: 'time_edit_not_allowed', status } });
    }
  });
});
