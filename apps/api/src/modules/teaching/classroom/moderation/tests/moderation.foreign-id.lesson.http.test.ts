import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LESSON_ID } from '@/modules/teaching/classroom/classroom.fakes';
import { classroomApp } from '@/modules/teaching/classroom/test-app';

const GUEST = 'guest-0123456789ab';
const room = (action: string) => `/lessons/${LESSON_ID}/room/participants/${GUEST}/${action}`;
const ROUTES = [
  { action: 'share', body: { allow: true } },
  { action: 'mute', body: { source: 'microphone' } },
  { action: 'remove', body: {} },
] as const;

describe('lesson room moderation with another teacher’s lesson id', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  const expectUntouched = () => {
    expect(h.moderation.participant).not.toHaveBeenCalled();
    expect(h.moderation.block).not.toHaveBeenCalled();
    expect(h.http).not.toHaveBeenCalled();
  };

  it.each(ROUTES)(
    'another teacher’s lesson is 403 on $action; no participant read, nothing sent',
    async ({ action, body }) => {
      const res = await h.call({ method: 'POST', url: room(action), token: 'other', body });
      expect(res.statusCode).toBe(403);
      expectUntouched();
    },
  );

  it('a salesperson cannot remove anyone from a lesson; nothing blocked or sent', async () => {
    h.queries.salesOwnsLesson.mockResolvedValue(false);
    const res = await h.call({ method: 'POST', url: room('remove'), token: 'sales' });
    expect([res.statusCode, res.json().code]).toEqual([403, 'cannot_remove']);
    expect(h.moderation.block).not.toHaveBeenCalled();
    expect(h.http).not.toHaveBeenCalled();
  });

  it('the lesson’s own teacher still grants a guest’s screen share', async () => {
    const res = await h.call({
      method: 'POST',
      url: room('share'),
      token: 'teacher',
      body: { allow: true },
    });
    expect(res.statusCode).toBe(204);
    expect(h.http).toHaveBeenCalledTimes(1);
  });
});
