import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN, ASSISTANT, LESSON_ID, queries, TEACHER } from '@/modules/teaching/classroom/classroom.fakes';
import type { RoomCloser } from '@/modules/teaching/classroom/max-duration/room-closer';
import { rolesOf } from '@/modules/teaching/classroom/moderation/moderation.fakes';
import type { LessonEndRepo } from './lesson-end.repo';
import { LessonEndService } from './lesson-end.service';
import type { RoomPresenceRepo } from './room-presence.repo';

const NOW = new Date('2026-10-05T16:30:00.000Z');
let ends: { stamp: ReturnType<typeof vi.fn> };
let presence: { leaveAll: ReturnType<typeof vi.fn> };
let closer: { configured: boolean; close: ReturnType<typeof vi.fn> };
const service = () =>
  new LessonEndService(rolesOf({ q: queries() }), ends as unknown as LessonEndRepo, presence as unknown as RoomPresenceRepo, closer as unknown as RoomCloser);
const end = (user = TEACHER) => service().end({ user, lessonId: LESSON_ID }, NOW);

beforeEach(() => {
  ends = { stamp: vi.fn(async (_id: string, at: string) => at) };
  presence = { leaveAll: vi.fn().mockResolvedValue(undefined) };
  closer = { configured: true, close: vi.fn().mockResolvedValue(true) };
});

describe('«إنهاء الحلقة للجميع» (POST /lessons/:id/end)', () => {
  it('the lesson\'s teacher stamps it, empties the room state and closes the LiveKit room', async () => {
    await expect(end()).resolves.toEqual({ endedAt: NOW.toISOString() });
    expect(ends.stamp).toHaveBeenCalledWith(LESSON_ID, NOW.toISOString());
    expect(presence.leaveAll).toHaveBeenCalledWith(LESSON_ID, NOW.toISOString());
    expect(closer.close).toHaveBeenCalledWith({ kind: 'lesson', id: LESSON_ID }, NOW);
  });

  it('idempotent: a second end answers the first time', async () => {
    ends.stamp.mockResolvedValue('2026-10-05T16:20:00.000Z');
    await expect(end(ADMIN)).resolves.toEqual({ endedAt: '2026-10-05T16:20:00.000Z' });
  });

  it('403 for an assistant: only the teacher or an admin ends it', async () => {
    const err = (await end(ASSISTANT).catch((e: HttpException) => e)) as HttpException;
    expect(err.getStatus()).toBe(403);
    expect(ends.stamp).not.toHaveBeenCalled();
  });

  it('LiveKit failing or not configured: the stamp still holds', async () => {
    closer.close.mockRejectedValue(new Error('down'));
    await expect(end()).resolves.toEqual({ endedAt: NOW.toISOString() });
    closer.configured = false;
    closer.close.mockClear();
    await end();
    expect(closer.close).not.toHaveBeenCalled();
  });
});
