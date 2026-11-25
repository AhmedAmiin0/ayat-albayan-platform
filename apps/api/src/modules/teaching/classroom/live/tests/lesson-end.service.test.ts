import type { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_JOIN_WINDOW } from '@ab/schedule';
import {
  ADMIN,
  ASSISTANT,
  LESSON,
  LESSON_ID,
  queries,
  TEACHER,
} from '@/modules/teaching/classroom/classroom.fakes';
import type { RoomCloser } from '@/modules/teaching/classroom/max-duration/room-closer';
import { rolesOf } from '@/modules/teaching/classroom/moderation/moderation.fakes';
import type { LessonEndRepo } from '@/modules/teaching/classroom/live/lesson-end.repo';
import { LessonEndService } from '@/modules/teaching/classroom/live/lesson-end.service';
import type { RoomPresenceRepo } from '@/modules/teaching/classroom/live/room-presence.repo';

const NOW = new Date('2026-10-05T16:30:00.000Z');
let q: ReturnType<typeof queries>;
let ends: { stamp: ReturnType<typeof vi.fn>; joinWindow: ReturnType<typeof vi.fn> };
let presence: { leaveAll: ReturnType<typeof vi.fn>; anyInside: ReturnType<typeof vi.fn> };
let closer: { configured: boolean; close: ReturnType<typeof vi.fn> };
const service = () =>
  new LessonEndService(
    rolesOf({ q }),
    ends as unknown as LessonEndRepo,
    presence as unknown as RoomPresenceRepo,
    closer as unknown as RoomCloser,
  );
const end = (user = TEACHER, now = NOW) => service().end({ user, lessonId: LESSON_ID }, now);
const code = async (p: Promise<unknown>) =>
  ((await p.catch((e: unknown) => e)) as HttpException).getResponse();

beforeEach(() => {
  q = queries();
  ends = {
    stamp: vi.fn(async (_id: string, at: string) => at),
    joinWindow: vi.fn().mockResolvedValue(DEFAULT_JOIN_WINDOW),
  };
  presence = {
    leaveAll: vi.fn().mockResolvedValue(undefined),
    anyInside: vi.fn().mockResolvedValue(false),
  };
  closer = { configured: true, close: vi.fn().mockResolvedValue(true) };
});

describe('«إنهاء الحلقة للجميع» (POST /lessons/:id/end)', () => {
  it("the lesson's teacher stamps it, empties the room state and closes the LiveKit room", async () => {
    await expect(end()).resolves.toEqual({ endedAt: NOW.toISOString() });
    expect(ends.stamp).toHaveBeenCalledWith(LESSON_ID, NOW.toISOString());
    expect(presence.leaveAll).toHaveBeenCalledWith(LESSON_ID, NOW.toISOString());
    expect(closer.close).toHaveBeenCalledWith({ kind: 'lesson', id: LESSON_ID }, NOW);
  });

  it('idempotent: a second end answers the first time, even after the window', async () => {
    ends.stamp.mockResolvedValue('2026-10-05T16:20:00.000Z');
    await expect(end(ADMIN)).resolves.toEqual({ endedAt: '2026-10-05T16:20:00.000Z' });
    q.lesson.mockResolvedValue({ ...LESSON, room_ended_at: '2026-10-05T16:20:00.000Z' });
    await expect(end(ADMIN, new Date('2026-10-06T10:00:00Z'))).resolves.toEqual({
      endedAt: '2026-10-05T16:20:00.000Z',
    });
  });

  it('409 lesson_not_live before the window with nobody inside, and for a cancelled lesson', async () => {
    const tomorrow = new Date('2026-10-04T10:00:00Z');
    expect(await code(end(TEACHER, tomorrow))).toMatchObject({ code: 'lesson_not_live' });
    q.lesson.mockResolvedValue({ ...LESSON, status: 'cancelled_by_admin' });
    presence.anyInside.mockResolvedValue(true);
    expect(await code(end())).toMatchObject({ code: 'lesson_not_live' });
    expect(ends.stamp).not.toHaveBeenCalled();
  });

  it('outside the window, a room with someone inside may still be ended', async () => {
    presence.anyInside.mockResolvedValue(true);
    const late = new Date('2026-10-05T20:00:00Z');
    await expect(end(TEACHER, late)).resolves.toEqual({ endedAt: late.toISOString() });
  });

  it('403 for an assistant: only the teacher or an admin ends it', async () => {
    const err = (await end(ASSISTANT).catch((e: unknown) => e)) as HttpException;
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
