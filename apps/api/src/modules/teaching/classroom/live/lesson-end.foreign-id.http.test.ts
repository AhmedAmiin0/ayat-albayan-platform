import { DEFAULT_JOIN_WINDOW } from '@ab/schedule';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LESSON_ID, OPEN } from '@/modules/teaching/classroom/classroom.fakes';
import { RoomCloser } from '@/modules/teaching/classroom/max-duration/room-closer';
import { classroomApp } from '@/modules/teaching/classroom/test-app';
import { LessonEndRepo } from './lesson-end.repo';
import { RoomPresenceRepo } from './room-presence.repo';

const end = `/lessons/${LESSON_ID}/end`;

describe('POST /lessons/:id/end with another teacher’s lesson id', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  const spies = () => ({
    window: vi.spyOn(h.app.get(LessonEndRepo), 'joinWindow').mockResolvedValue(DEFAULT_JOIN_WINDOW),
    stamp: vi.spyOn(h.app.get(LessonEndRepo), 'stamp').mockResolvedValue(OPEN.toISOString()),
    leave: vi.spyOn(h.app.get(RoomPresenceRepo), 'leaveAll').mockResolvedValue(undefined),
    inside: vi.spyOn(h.app.get(RoomPresenceRepo), 'anyInside').mockResolvedValue(true),
    close: vi.spyOn(h.app.get(RoomCloser), 'close').mockResolvedValue(true),
  });
  let s: ReturnType<typeof spies>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(OPEN);
    h.reset();
    s = spies();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('another teacher’s lesson is 403; nothing stamped, nobody let out, no room closed', async () => {
    const res = await h.call({ method: 'POST', url: end, token: 'other' });
    expect(res.statusCode).toBe(403);
    expect(s.stamp).not.toHaveBeenCalled();
    expect(s.leave).not.toHaveBeenCalled();
    expect(s.close).not.toHaveBeenCalled();
    expect(h.http).not.toHaveBeenCalled();
  });

  it('the lesson’s own teacher still ends it for everyone', async () => {
    const res = await h.call({ method: 'POST', url: end, token: 'teacher' });
    expect([res.statusCode, res.json()]).toEqual([200, { endedAt: OPEN.toISOString() }]);
    expect(s.stamp).toHaveBeenCalledWith(LESSON_ID, OPEN.toISOString());
  });
});
