import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LESSON_ID, OTHER_TEACHER } from '@/modules/teaching/classroom/classroom.fakes';
import { MEETING_ID } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.fakes';
import type { FetchLike } from '@/common/infra/http/failure';
import { sentBody, twirpAnswer } from '@/modules/teaching/classroom/livekit/livekit.fakes';
import { http, participantRow } from './moderation.fakes';
import { MuteLimit, MUTES_PER_WINDOW } from './mute-limit';
import { classroomApp } from '@/modules/teaching/classroom/test-app';

// «كتم الميكروفون» / «إيقاف الكاميرا» (owner, 2026-10-05): LiveKit GetParticipant → MutePublishedTrack.

const GUEST = 'guest-0123456789ab';
const lesson = (identity = GUEST) => `/lessons/${LESSON_ID}/room/participants/${identity}/mute`;
const meeting = (identity = GUEST) => `/meetings/${MEETING_ID}/participants/${identity}/mute`;
const TRACKS = { tracks: [{ sid: 'TR_mic', source: 'MICROPHONE' }, { sid: 'TR_cam', source: 'CAMERA' }] };

/** LiveKit answering GetParticipant with the guest's two tracks, anything else with {}. */
const livekit: FetchLike = async (url) => twirpAnswer(200, url.endsWith('/GetParticipant') ? TRACKS : {});

describe('mute routes', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  const muted = () => h.http.mock.calls.filter(([url]) => url.endsWith('/MutePublishedTrack')).map(([, init]) => sentBody(init));
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    h.http.mockImplementation(livekit);
  });

  it('lesson: the teacher mutes a guest’s mic, an assistant turns off their camera', async () => {
    expect((await h.call({ method: 'POST', url: lesson(), token: 'teacher', body: { source: 'microphone' } })).statusCode).toBe(204);
    expect((await h.call({ method: 'POST', url: lesson(), token: 'assistant', body: { source: 'camera' } })).statusCode).toBe(204);
    expect(muted()).toEqual([
      { room: `lesson-${LESSON_ID}`, identity: GUEST, track_sid: 'TR_mic', muted: true },
      { room: `lesson-${LESSON_ID}`, identity: GUEST, track_sid: 'TR_cam', muted: true },
    ]);
  });

  it('lesson: 403 cannot_mute up the hierarchy, 403 for sales / a guardian, 404, 400', async () => {
    h.moderation.participant.mockResolvedValueOnce(participantRow({ role: 'teacher', identity: 'teacher-0123456789ab' }));
    const up = await h.call({ method: 'POST', url: lesson('teacher-0123456789ab'), token: 'assistant', body: { source: 'microphone' } });
    expect([up.statusCode, up.json().code]).toEqual([403, 'cannot_mute']);
    expect((await h.call({ method: 'POST', url: lesson(), token: 'sales', body: { source: 'microphone' } })).statusCode).toBe(403);
    expect((await h.call({ method: 'POST', url: lesson(), token: 'guardian', body: { source: 'microphone' } })).statusCode).toBe(403);
    h.moderation.participant.mockResolvedValueOnce(null);
    expect((await h.call({ method: 'POST', url: lesson(), body: { source: 'microphone' } })).json().code).toBe('participant_not_found');
    expect((await h.call({ method: 'POST', url: lesson('x'), body: { source: 'microphone' } })).statusCode).toBe(404);
    expect((await h.call({ method: 'POST', url: lesson(), body: { source: 'screen' } })).statusCode).toBe(400);
    expect(muted()).toEqual([]);
  });

  it('LiveKit: gone → 404 participant_not_found, refused → 502; nothing published → 204, no mute', async () => {
    h.http.mockImplementationOnce(http({ status: 404, body: { code: 'not_found' } }));
    expect((await h.call({ method: 'POST', url: lesson(), body: { source: 'camera' } })).json().code).toBe('participant_not_found');
    h.http.mockImplementationOnce(http({ status: 500, body: { code: 'internal' } }));
    expect((await h.call({ method: 'POST', url: lesson(), body: { source: 'camera' } })).statusCode).toBe(502);
    h.http.mockImplementationOnce(http({ body: { tracks: [] } }));
    expect((await h.call({ method: 'POST', url: lesson(), body: { source: 'camera' } })).statusCode).toBe(204);
    expect(muted()).toEqual([]);
  });

  it('meeting: the host mutes a guest; nobody mutes an admin; sales may not', async () => {
    expect((await h.call({ method: 'POST', url: meeting(), token: 'teacher', body: { source: 'microphone' } })).statusCode).toBe(204);
    expect(muted()).toEqual([{ room: `meeting-${MEETING_ID}`, identity: GUEST, track_sid: 'TR_mic', muted: true }]);
    const admin = await h.call({ method: 'POST', url: meeting('admin-0123456789ab'), token: 'admin', body: { source: 'microphone' } });
    expect([admin.statusCode, admin.json().code]).toEqual([403, 'cannot_mute']);
    expect((await h.call({ method: 'POST', url: meeting(), token: 'sales', body: { source: 'microphone' } })).statusCode).toBe(403);
    h.meetings.byId.mockResolvedValueOnce(null);
    expect((await h.call({ method: 'POST', url: meeting(), body: { source: 'microphone' } })).statusCode).toBe(404);
  });

  it('429 too_many_requests once a login has used up its mutes', async () => {
    const limit = h.app.get(MuteLimit);
    for (let i = 0; i < MUTES_PER_WINDOW; i += 1) limit.assert(OTHER_TEACHER.id);
    const res = await h.call({ method: 'POST', url: lesson(), token: 'other', body: { source: 'microphone' } });
    expect([res.statusCode, res.json().code]).toEqual([429, 'too_many_requests']);
  });
});
