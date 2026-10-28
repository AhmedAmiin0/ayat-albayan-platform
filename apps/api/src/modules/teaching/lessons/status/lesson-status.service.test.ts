import { ForbiddenException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '../../../../common/settings/settings.fakes';
import { conflict } from '../../../../common/http/errors';
import type { LessonAccess } from '../store/lesson-access';
import type { LessonRow } from '../store/lesson-row';
import { LessonStatusService } from './lesson-status.service';
import { ADMIN, appliedChange, fakeStore, LESSON_ID, lessonRow, TEACHER } from '../lessons.fakes';
import { LessonsSettings } from '../lessons.settings';

const access = { assertCanTouch: vi.fn() };
const AFTER = new Date('2026-10-04T15:00:00Z');
const BEFORE = new Date('2026-10-04T10:00:00Z');

function setup(row: LessonRow | null = lessonRow(), lateCancelHours: number | null = null) {
  const deps = fakeStore(row);
  const service = new LessonStatusService(deps.store, access as unknown as LessonAccess, readerOf(LessonsSettings, { booking_horizon_weeks: 5, late_cancel_hours: lateCancelHours }));
  return { ...deps, service };
}

describe('LessonStatusService.confirm (R-SCH-03, issue B2)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ now: BEFORE });
  });
  afterEach(() => vi.useRealTimers());

  it('scheduled → confirmed with confirmed_at / confirmed_by, compare-and-set on the old status, audited', async () => {
    const { service, writer, record } = setup();
    expect(await service.confirm({ lessonId: LESSON_ID, actor: ADMIN })).toBe(LESSON_ID);
    expect(appliedChange(writer)).toEqual({
      actor: ADMIN.id,
      changes: [{ id: LESSON_ID, from_status: 'scheduled', to_status: 'confirmed', confirmed_at: BEFORE.toISOString(), confirmed_by: ADMIN.id }],
    });
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'lessons', action: 'confirm', before: { status: 'scheduled' } }));
  });

  it('already confirmed → unchanged, no write (the guardian may answer twice)', async () => {
    const { service, writer } = setup(lessonRow({ status: 'confirmed' }));
    expect(await service.confirm({ lessonId: LESSON_ID, actor: null })).toBe(LESSON_ID);
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('webhook confirm (actor null) skips the access check and leaves confirmed_by null', async () => {
    const { service, writer } = setup();
    await service.confirm({ lessonId: LESSON_ID, actor: null });
    expect(access.assertCanTouch).not.toHaveBeenCalled();
    expect(appliedChange(writer)?.changes[0]).toMatchObject({ confirmed_by: null });
  });

  it('a terminal lesson → 409 invalid_transition { from, event }', async () => {
    const { service } = setup(lessonRow({ status: 'completed' }));
    await expect(service.confirm({ lessonId: LESSON_ID, actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'invalid_transition', from: 'completed', event: 'confirm' },
    });
  });

  it('lost compare-and-set: fine if it is confirmed now, 409 otherwise', async () => {
    const { service, writer, queries } = setup();
    writer.apply.mockRejectedValue(conflict('invalid_transition'));
    queries.get.mockResolvedValueOnce(lessonRow()).mockResolvedValueOnce(lessonRow({ status: 'confirmed' }));
    expect(await service.confirm({ lessonId: LESSON_ID, actor: ADMIN })).toBe(LESSON_ID);
    queries.get.mockResolvedValueOnce(lessonRow()).mockResolvedValueOnce(lessonRow({ status: 'cancelled_by_admin' }));
    await expect(service.confirm({ lessonId: LESSON_ID, actor: ADMIN })).rejects.toMatchObject({ status: 409 });
  });

  it("another teacher's lesson → 403 before any write", async () => {
    access.assertCanTouch.mockRejectedValue(new ForbiddenException());
    const { service, writer } = setup();
    await expect(service.confirm({ lessonId: LESSON_ID, actor: TEACHER })).rejects.toBeInstanceOf(ForbiddenException);
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('404 for an unknown lesson', async () => {
    const { service } = setup(null);
    await expect(service.confirm({ lessonId: LESSON_ID, actor: ADMIN })).rejects.toMatchObject({ status: 404 });
  });

  it('anyLesson (sales\' lessons.confirm route): no teacher-only check, the salesperson is confirmed_by', async () => {
    const sales = { id: 'a1000000-0000-4000-8000-00000000000a', email: null, role: 'sales' as const };
    const { service, writer } = setup();
    await service.confirm({ lessonId: LESSON_ID, actor: sales, anyLesson: true });
    expect(access.assertCanTouch).not.toHaveBeenCalled();
    expect(appliedChange(writer)?.changes[0]).toMatchObject({ to_status: 'confirmed', confirmed_by: sales.id });
    expect(appliedChange(writer)?.messages ?? []).toEqual([]);
  });
});

describe('LessonStatusService.changeStatus (R-SCH-08 attendance, R-SCH-07 chargeable)', () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.useRealTimers());

  it.each([
    { event: 'complete', to: 'completed', attendance: 'on_time', chargeable: true },
    { event: 'mark_late', to: 'late', attendance: 'late', chargeable: true },
    { event: 'mark_no_show', to: 'no_show', attendance: 'absent', chargeable: true },
    { event: 'excuse', to: 'excused', attendance: 'excused', chargeable: false },
  ] as const)('$event → $to, attendance $attendance, chargeable $chargeable', async ({ event, to, attendance, chargeable }) => {
    vi.useFakeTimers({ now: AFTER });
    const { service, writer, record } = setup();
    await service.changeStatus({ lessonId: LESSON_ID, event, actor: TEACHER });
    expect(appliedChange(writer)?.changes).toEqual([
      { id: LESSON_ID, from_status: 'scheduled', to_status: to, attendance, chargeable },
    ]);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'status_change', after: { status: to, chargeable } }));
  });

  it('outcomes before the start → 409 not_started; excuse is allowed any time', async () => {
    vi.useFakeTimers({ now: BEFORE });
    const { service, writer } = setup();
    await expect(service.changeStatus({ lessonId: LESSON_ID, event: 'complete', actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'not_started' },
    });
    await service.changeStatus({ lessonId: LESSON_ID, event: 'excuse', actor: ADMIN });
    expect(writer.apply).toHaveBeenCalledTimes(1);
  });

  it('an excuse inside late_cancel_hours consumes the lesson', async () => {
    vi.useFakeTimers({ now: BEFORE });
    const { service, writer } = setup(lessonRow(), 6);
    await service.changeStatus({ lessonId: LESSON_ID, event: 'excuse', actor: ADMIN });
    expect(appliedChange(writer)?.changes[0]?.chargeable).toBe(true);
  });

  it('a terminal lesson → 409; a lost compare-and-set → 409 with the read status', async () => {
    vi.useFakeTimers({ now: AFTER });
    const done = setup(lessonRow({ status: 'no_show' }));
    await expect(done.service.changeStatus({ lessonId: LESSON_ID, event: 'complete', actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'invalid_transition', from: 'no_show', event: 'complete' },
    });
    const raced = setup();
    raced.writer.apply.mockRejectedValue(conflict('invalid_transition'));
    await expect(raced.service.changeStatus({ lessonId: LESSON_ID, event: 'complete', actor: ADMIN })).rejects.toMatchObject({
      response: { code: 'invalid_transition', from: 'scheduled', event: 'complete' },
    });
    expect(raced.record).not.toHaveBeenCalled();
  });
});
