import { describe, expect, it, vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import {
  LessonLivePush,
  lessonLivePushes,
  type LiveLesson,
} from '@/modules/teaching/classroom/live/lesson-live.push';
import type { LessonLiveRepo } from '@/modules/teaching/classroom/live/lesson-live.repo';

const LESSON: LiveLesson = {
  id: 'l1',
  starts_at: '2026-11-16T10:00:00.000Z',
  status: 'scheduled',
  room_ended_at: null,
  students: [
    {
      id: 's1',
      name: 'سارة',
      tz: 'Asia/Riyadh',
      profile_id: 'p-student',
      guardian: { profile_id: 'p-guardian', tz: 'Asia/Riyadh' },
    },
  ],
};

describe('lessonLivePushes («بدأت الحلقة»)', () => {
  it("the guardian and the student's own login, keyed by the lesson, with lessonId and studentId", () => {
    const pushes = lessonLivePushes(LESSON);
    expect(pushes.map((p) => p.profileIds)).toEqual([['p-guardian'], ['p-student']]);
    expect(pushes[0]).toMatchObject({
      kind: 'lesson_live',
      subject: 'lesson:l1',
      data: { lessonId: 'l1', studentId: 's1' },
    });
  });

  it('nobody for a cancelled lesson or one ended for everyone', () => {
    expect(lessonLivePushes({ ...LESSON, status: 'cancelled_by_admin' })).toEqual([]);
    expect(lessonLivePushes({ ...LESSON, room_ended_at: '2026-11-16T10:30:00.000Z' })).toEqual([]);
  });
});

describe('LessonLivePush', () => {
  it('hands each target to PushService (its dedup key makes only the first arrival count)', async () => {
    const notifyProfiles = vi.fn().mockResolvedValue(undefined);
    const push = new LessonLivePush(
      { lesson: vi.fn().mockResolvedValue(LESSON) } as unknown as LessonLiveRepo,
      { notifyProfiles } as unknown as PushService,
    );
    await push.teacherEntered('l1');
    expect(notifyProfiles).toHaveBeenCalledTimes(2);
  });

  it('never throws: a failed read is logged', async () => {
    const push = new LessonLivePush(
      { lesson: vi.fn().mockRejectedValue(new Error('down')) } as unknown as LessonLiveRepo,
      { notifyProfiles: vi.fn() } as unknown as PushService,
    );
    await expect(push.teacherEntered('l1')).resolves.toBeUndefined();
  });
});
