import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import { ruleRow } from '@/modules/teaching/scheduling/scheduling.fakes';
import type { ScheduleRepo } from '@/modules/teaching/scheduling/schedule.repo';
import {
  ADMIN,
  appliedChange,
  fakeStore,
  LESSON_ID,
  lessonRow,
} from '@/modules/teaching/lessons/lessons.fakes';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import { LessonCancelService } from '@/modules/teaching/lessons/status/lesson-cancel.service';
import { fakeCorrection } from './auto-held.fakes';

// «لم تنعقد؟» through POST /lessons/:id/cancel (LessonCancelService → AutoHeldCorrection).
const AFTER = new Date('2026-10-04T16:00:00Z'); // the fixture lesson ended at 14:45Z

function setup(o: { correctable?: string[]; lateCancelHours?: number | null } = {}) {
  const deps = fakeStore(lessonRow({ status: 'completed' }));
  const settings = readerOf(LessonsSettings, { late_cancel_hours: o.lateCancelHours ?? null });
  const { correction, repo } = fakeCorrection(deps.store, settings, o.correctable ?? [LESSON_ID]);
  const rules = { rule: vi.fn(async () => ruleRow()) } as unknown as ScheduleRepo;
  return {
    ...deps,
    repo,
    service: new LessonCancelService(deps.store, rules, settings, correction),
  };
}
const body = (by: 'teacher' | 'student' | 'admin') => ({
  scope: 'one' as const,
  by,
  reason: 'لم يحضر المعلم',
});

describe('correcting an auto-held lesson (owner 2026-11-02)', () => {
  beforeEach(() => vi.useFakeTimers({ now: AFTER }));
  afterEach(() => vi.useRealTimers());

  it('«ألغاها المعلم/ة»: completed → cancelled_by_teacher, not counted, audited as a correction', async () => {
    const { service, writer, record } = setup();
    expect(
      await service.cancel({ lessonId: LESSON_ID, body: body('teacher'), actor: ADMIN }),
    ).toEqual([LESSON_ID]);
    expect(appliedChange(writer)).toEqual({
      actor: ADMIN.id,
      changes: [
        {
          id: LESSON_ID,
          from_status: 'completed',
          to_status: 'cancelled_by_teacher',
          cancel_reason: 'لم يحضر المعلم',
          chargeable: false,
        },
      ],
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'cancel',
        before: { status: 'completed' },
        after: expect.objectContaining({
          status: 'cancelled_by_teacher',
          correction: 'auto_held_correction',
        }),
      }),
    );
  });

  it('«اعتذر الطالب»: excused; counted exactly per late_cancel_hours (after the start = late)', async () => {
    const free = setup();
    await free.service.cancel({ lessonId: LESSON_ID, body: body('student'), actor: ADMIN });
    expect(appliedChange(free.writer)?.changes[0]).toMatchObject({
      to_status: 'excused',
      attendance: 'excused',
      chargeable: false,
    });
    const late = setup({ lateCancelHours: 24 });
    await late.service.cancel({ lessonId: LESSON_ID, body: body('student'), actor: ADMIN });
    expect(appliedChange(late.writer)?.changes[0]).toMatchObject({
      to_status: 'excused',
      chargeable: true,
    });
  });

  it('a completed lesson the job did not close (a report, a staff «تم»): 409 not_auto_held, nothing written', async () => {
    const { service, writer } = setup({ correctable: [] });
    await expect(
      service.cancel({ lessonId: LESSON_ID, body: body('teacher'), actor: ADMIN }),
    ).rejects.toMatchObject({ response: { code: 'not_auto_held' } });
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('«ألغتها الإدارة» on a completed lesson stays a 409 invalid_transition (as today)', async () => {
    const { service, repo } = setup();
    await expect(
      service.cancel({ lessonId: LESSON_ID, body: body('admin'), actor: ADMIN }),
    ).rejects.toMatchObject({ response: { code: 'invalid_transition' } });
    expect(repo.correctable).not.toHaveBeenCalled();
  });
});
