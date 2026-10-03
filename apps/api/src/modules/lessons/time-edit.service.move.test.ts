import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { body, CLASH, LESSON_ID, lessonRow, NOW, retimed, timeSetup } from './time-edit.fakes';
import { ADMIN, STUDENT_ID, TEACHER_ID } from './lessons.fakes';

const STUDENT_CLASH = { kind: 'student_busy', startsAt: '2026-10-05T14:00:00.000Z', endsAt: '2026-10-05T14:45:00.000Z', studentId: STUDENT_ID };

describe('LessonTimeService — move a scheduled / confirmed lesson (R-SCH-11)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('edits the SAME lesson: compare-and-set payload, audit, no change set, view of the same id', async () => {
    const { run, writer, record } = timeSetup();
    const res = await run(body({ reason: 'طلب ولي الأمر' }));
    expect(writer.apply).not.toHaveBeenCalled();
    expect(retimed(writer)).toEqual({
      actor: ADMIN.id,
      lesson_id: LESSON_ID,
      from: { status: 'scheduled', starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:45:00.000Z' },
      to: { starts_at: '2026-10-05T14:00:00.000Z', ends_at: '2026-10-05T14:45:00.000Z' },
      reason: 'طلب ولي الأمر',
      override_reason: null,
      retime_open: true,
      refresh_pdf: false,
      messages: [expect.objectContaining({ lesson_id: LESSON_ID, template_key: 'booking_confirmation' })],
      audit: expect.objectContaining({ entity: 'lessons', entity_id: LESSON_ID, action: 'time_edit' }),
    });
    expect(record).toHaveBeenCalledWith({
      actorId: ADMIN.id,
      entity: 'lessons',
      entityId: LESSON_ID,
      action: 'time_edit',
      before: { starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:45:00.000Z' },
      after: {
        starts_at: '2026-10-05T14:00:00.000Z',
        ends_at: '2026-10-05T14:45:00.000Z',
        reason: 'طلب ولي الأمر',
        override_reason: null,
        notified: 1,
        mode: 'move',
      },
    });
    expect(res).toEqual({ notified: 1, payout: 'none', pdf_refresh: false });
  });

  it('a confirmed lesson moves too; the RPC (not the state machine) sends it back to scheduled', async () => {
    const { run, writer } = timeSetup(lessonRow({ status: 'confirmed', confirmed_at: '2026-10-03T08:00:00Z' }));
    await run(body());
    expect(retimed(writer).from.status).toBe('confirmed');
  });

  it('resize in place (45 → 60, same start): new end, nothing queued, no key release', async () => {
    const { run, writer, payouts } = timeSetup();
    const res = await run(body({ startsAt: '2026-10-04T14:00:00.000Z', durationMin: 60 }));
    expect(retimed(writer)).toMatchObject({
      to: { starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T15:00:00.000Z' },
      retime_open: false,
      messages: [],
    });
    expect(res.notified).toBe(0);
    expect(payouts.payoutStatus).toHaveBeenCalledWith(TEACHER_ID, '2026-10');
  });

  it('checks the new time against the teacher and the students, without the lesson itself', async () => {
    const { run, checker } = timeSetup();
    await run(body({ durationMin: 60 }));
    expect(checker.check).toHaveBeenCalledWith({
      teacherId: TEACHER_ID,
      studentIds: [STUDENT_ID],
      proposed: [{ starts_at: new Date('2026-10-05T14:00:00Z'), ends_at: new Date('2026-10-05T15:00:00Z') }],
      excludeIds: [LESSON_ID],
    });
  });

  it('a teacher clash or a student clash blocks with 409 conflict + the list; nothing is written', async () => {
    for (const clash of [CLASH, STUDENT_CLASH]) {
      const t = timeSetup();
      t.checker.check.mockResolvedValue([clash]);
      await expect(t.run(body())).rejects.toMatchObject({ status: 409, response: { code: 'conflict', message: 'conflict', conflicts: [clash] } });
      expect(t.writer.retime).not.toHaveBeenCalled();
    }
  });

  it('with an override reason a clash is stored; an override without a clash stores nothing', async () => {
    const forced = timeSetup();
    forced.checker.check.mockResolvedValue([CLASH]);
    await forced.run(body({ override: { reason: 'اتفقنا مع الأهل' } }));
    expect(retimed(forced.writer).override_reason).toBe('اتفقنا مع الأهل');
    const free = timeSetup();
    await free.run(body({ override: { reason: 'x' } }));
    expect(retimed(free.writer).override_reason).toBeNull();
  });

  it('the weekly grid and time-off still block a move (only a correction ignores them)', async () => {
    const t = timeSetup();
    t.checker.check.mockResolvedValue([{ kind: 'outside_availability', startsAt: 'a', endsAt: 'b' }]);
    await expect(t.run(body())).rejects.toMatchObject({ status: 409, response: { code: 'conflict' } });
  });

  it('a move to the past is 400 date_in_past', async () => {
    const t = timeSetup();
    await expect(t.run(body({ startsAt: '2026-10-02T09:00:00.000Z' }))).rejects.toMatchObject({ status: 400, response: { code: 'date_in_past' } });
    expect(t.writer.retime).not.toHaveBeenCalled();
  });

  it('closed statuses get 409 time_edit_not_allowed with the status', async () => {
    for (const status of ['cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled', 'excused', 'no_show'] as const) {
      const t = timeSetup(lessonRow({ status }));
      await expect(t.run(body())).rejects.toMatchObject({ status: 409, response: { code: 'time_edit_not_allowed', status } });
      expect(t.writer.retime).not.toHaveBeenCalled();
    }
  });

  it('an unknown lesson is 404', async () => {
    await expect(timeSetup(null).run(body())).rejects.toMatchObject({ status: 404 });
  });
});
