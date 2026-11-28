import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LESSON_ID } from '@/modules/teaching/classroom/classroom.fakes';
import { MEETING_ID } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.fakes';
import { classroomApp } from '@/modules/teaching/classroom/test-app';

const WHO = 'guest-0123456789ab';
const inLesson = (id: string, action: string) =>
  `/lessons/${id}/room/participants/${WHO}/${action}`;
const inMeeting = (identity: string) => `/meetings/${MEETING_ID}/participants/${identity}/mute`;

describe('room moderation routes: inputs parsed by the route object', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it.each([
    ['POST', inLesson('x', 'remove')],
    ['POST', inLesson('x', 'share')],
    ['GET', '/lessons/x/recordings'],
    ['POST', '/lessons/x/end'],
  ] as const)('%s %s: 400 validation_failed for a lesson id not a uuid', async (method, url) => {
    const res = await h.call({ method, url, body: { allow: true } });
    expect([res.statusCode, res.json().code]).toEqual([400, 'validation_failed']);
  });

  it('404 participant_not_found for an identity the api never minted', async () => {
    const body = { source: 'microphone' };
    const res = await h.call({ method: 'POST', url: inMeeting('x'), body });
    expect([res.statusCode, res.json().code]).toEqual([404, 'participant_not_found']);
  });

  it('400 for a body outside the route schema, before LiveKit is asked', async () => {
    const res = await h.call({ method: 'POST', url: inMeeting(WHO), body: { source: 'screen' } });
    expect(res.statusCode).toBe(400);
    expect(h.http).not.toHaveBeenCalled();
  });

  it('answers the recording status and the lesson recordings through their schemas', async () => {
    const status = await h.call({ method: 'GET', url: '/recordings/status' });
    expect(status.json()).toEqual({ configured: expect.any(Boolean) });
    const list = await h.call({ method: 'GET', url: `/lessons/${LESSON_ID}/recordings` });
    expect(list.statusCode).toBe(200);
  });
});
