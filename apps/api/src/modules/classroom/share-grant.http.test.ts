import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LESSON_ID } from './classroom.fakes';
import { MEETING_ID } from './internal-meetings.fakes';
import { http, participantRow } from './moderation.fakes';
import { classroomApp } from './test-app';

// «اطلب مشاركة الشاشة» → «سماح» / «إيقاف مشاركة» (owner, 2026-10-05): LiveKit UpdateParticipant.

const lesson = (identity = 'guest-0123456789ab') => `/lessons/${LESSON_ID}/room/participants/${identity}/share`;
const meeting = (identity = 'guest-0123456789ab') => `/meetings/${MEETING_ID}/participants/${identity}/share`;
const sentBody = (h: { http: { mock: { calls: unknown[][] } } }) => {
  const init = h.http.mock.calls.at(-1)?.[1] as { body: string } | undefined;
  return JSON.parse(init?.body ?? '{}') as { permission: { can_publish_sources: string[]; can_subscribe: boolean } };
};

describe('screen share grant routes', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it('lesson: «سماح» adds the screen, «إيقاف» takes it back (UpdateParticipant, roomAdmin)', async () => {
    expect((await h.call({ method: 'POST', url: lesson(), token: 'teacher', body: { allow: true } })).statusCode).toBe(204);
    expect(h.http.mock.calls.at(-1)?.[0]).toMatch(/RoomService\/UpdateParticipant$/);
    expect(sentBody(h).permission).toMatchObject({ can_subscribe: true, can_publish_sources: ['CAMERA', 'MICROPHONE', 'SCREEN_SHARE', 'SCREEN_SHARE_AUDIO'] });
    expect((await h.call({ method: 'POST', url: lesson(), token: 'assistant', body: { allow: false } })).statusCode).toBe(204);
    expect(sentBody(h).permission.can_publish_sources).toEqual(['CAMERA', 'MICROPHONE']);
  });

  it('lesson: 403 for sales or a guardian, 403 cannot_grant_share for a staff target, 404, 400 body', async () => {
    expect((await h.call({ method: 'POST', url: lesson(), token: 'sales', body: { allow: true } })).statusCode).toBe(403);
    expect((await h.call({ method: 'POST', url: lesson(), token: 'guardian', body: { allow: true } })).statusCode).toBe(403);
    h.moderation.participant.mockResolvedValueOnce(participantRow({ role: 'assistant', identity: 'assistant-0123456789ab' }));
    const staff = await h.call({ method: 'POST', url: lesson('assistant-0123456789ab'), body: { allow: true } });
    expect([staff.statusCode, staff.json().code]).toEqual([403, 'cannot_grant_share']);
    h.moderation.participant.mockResolvedValueOnce(null);
    expect((await h.call({ method: 'POST', url: lesson(), body: { allow: true } })).json().code).toBe('participant_not_found');
    expect((await h.call({ method: 'POST', url: lesson('x'), body: { allow: true } })).statusCode).toBe(404);
    expect((await h.call({ method: 'POST', url: lesson(), body: { allow: 'yes' } })).statusCode).toBe(400);
  });

  it('LiveKit answers: not_found → 404 participant_not_found, anything else → 502', async () => {
    h.http.mockImplementationOnce(http({ status: 404, body: { code: 'not_found' } }));
    expect((await h.call({ method: 'POST', url: lesson(), body: { allow: true } })).json().code).toBe('participant_not_found');
    h.http.mockImplementationOnce(http({ status: 500, body: { code: 'internal' } }));
    expect((await h.call({ method: 'POST', url: lesson(), body: { allow: true } })).statusCode).toBe(502);
  });

  it('meeting: the host grants a guest; a guest identity only; any staff login with a role', async () => {
    expect((await h.call({ method: 'POST', url: meeting(), token: 'teacher', body: { allow: true } })).statusCode).toBe(204);
    expect(h.http.mock.calls.at(-1)?.[0]).toMatch(/UpdateParticipant$/);
    const staff = await h.call({ method: 'POST', url: meeting('teacher-0123456789ab'), token: 'admin', body: { allow: true } });
    expect([staff.statusCode, staff.json().code]).toEqual([403, 'cannot_grant_share']);
    expect((await h.call({ method: 'POST', url: meeting(), token: 'sales', body: { allow: true } })).statusCode).toBe(403);
    expect((await h.call({ method: 'POST', url: '/meetings/nope/participants/guest-0123456789ab/share', body: { allow: true } })).statusCode).toBe(400);
    h.meetings.byId.mockResolvedValueOnce(null);
    expect((await h.call({ method: 'POST', url: meeting(), body: { allow: true } })).statusCode).toBe(404);
  });
});
