import { ForbiddenException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LESSON_ID,
  lessonRow,
  TEACHER,
  TEACHER_ID,
} from '@/modules/teaching/lessons/lessons.fakes';
import { access, LATER, NOW, proposals, proposer } from './proposals.fakes';

describe('LessonProposeService — «اقترح موعدًا آخر» (R-SCH-08)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ now: NOW });
  });
  afterEach(() => vi.useRealTimers());

  it("stores a pending proposal for the teacher's own open lesson", async () => {
    expect(
      await proposer().propose({
        lessonId: LESSON_ID,
        body: { startsAt: LATER, note: 'سفر' },
        actor: TEACHER,
      }),
    ).toBe(LESSON_ID);
    expect(access.assertCanTouch).toHaveBeenCalledWith(
      TEACHER,
      expect.objectContaining({ teacher_id: TEACHER_ID }),
    );
    expect(proposals.create).toHaveBeenCalledWith({
      lesson_id: LESSON_ID,
      teacher_id: TEACHER_ID,
      proposed_starts_at: LATER,
      note: 'سفر',
      created_by: TEACHER.id,
    });
  });

  it("another teacher's lesson → 403; a closed lesson → 409; a past time → 400; nothing stored", async () => {
    access.assertCanTouch.mockRejectedValueOnce(new ForbiddenException());
    await expect(
      proposer().propose({ lessonId: LESSON_ID, body: { startsAt: LATER }, actor: TEACHER }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      proposer(lessonRow({ status: 'completed' })).propose({
        lessonId: LESSON_ID,
        body: { startsAt: LATER },
        actor: TEACHER,
      }),
    ).rejects.toMatchObject({ response: { code: 'invalid_transition' } });
    await expect(
      proposer().propose({
        lessonId: LESSON_ID,
        body: { startsAt: '2026-10-01T10:00:00Z' },
        actor: TEACHER,
      }),
    ).rejects.toMatchObject({ response: { code: 'date_in_past' } });
    expect(proposals.create).not.toHaveBeenCalled();
  });
});
