import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LESSON_ID, OPEN } from '../classroom.fakes';
import { participantRow, recordingRow, signedWebhook } from './moderation.fakes';
import { classroomApp } from '../test-app';

const remove = (identity = 'guest-0123456789ab') => `/lessons/${LESSON_ID}/room/participants/${identity}/remove`;
const recordings = `/lessons/${LESSON_ID}/recordings`;
const event = (status: string) => Buffer.from(JSON.stringify({ event: 'egress_ended', egressInfo: { egressId: 'EG_abc', status } }));

describe('classroom moderation routes', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(OPEN);
    h.reset();
  });
  afterEach(() => vi.useRealTimers());

  it('POST …/remove: 204 for the admin; the link is blocked and LiveKit asked to disconnect', async () => {
    const res = await h.call({ method: 'POST', url: remove() });
    expect(res.statusCode).toBe(204);
    expect(h.moderation.block).toHaveBeenCalledWith(expect.objectContaining({ principal: { joinLinkId: participantRow().join_link_id } }));
    expect(h.http.mock.calls[0]?.[0]).toMatch(/RemoveParticipant$/);
  });

  it('POST …/remove: 401 without a login, 403 for a guardian, 403 cannot_remove for an assistant', async () => {
    expect((await h.call({ method: 'POST', url: remove(), token: null })).statusCode).toBe(401);
    expect((await h.call({ method: 'POST', url: remove(), token: 'guardian' })).statusCode).toBe(403);
    const res = await h.call({ method: 'POST', url: remove(), token: 'assistant' });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: 'cannot_remove' });
  });

  it('POST …/remove: 404 participant_not_found for an unknown or malformed identity', async () => {
    h.moderation.participant.mockResolvedValue(null);
    expect((await h.call({ method: 'POST', url: remove() })).json()).toMatchObject({ code: 'participant_not_found' });
    const bad = await h.call({ method: 'POST', url: remove('not-an-identity!') });
    expect(bad.statusCode).toBe(404);
    expect(h.moderation.participant).toHaveBeenCalledTimes(1);
  });

  it('a staff join records the participant and starts the recording', async () => {
    const res = await h.call({ method: 'POST', url: `/lessons/${LESSON_ID}/room/join`, token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(h.moderation.addParticipant).toHaveBeenCalledWith(expect.objectContaining({ role: 'teacher', lesson_id: LESSON_ID }));
    await vi.waitFor(() => expect(h.recordings.attachEgress).toHaveBeenCalledWith(expect.any(String), 'EG_new'));
  });

  it('a removed teacher is refused 403 removed_from_room', async () => {
    h.moderation.isBlocked.mockResolvedValue(true);
    const res = await h.call({ method: 'POST', url: `/lessons/${LESSON_ID}/room/join`, token: 'teacher' });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: 'removed_from_room' });
  });

  it('GET recordings: LessonRecordingView[] for the admin and the lesson teacher, 403 for others', async () => {
    const res = await h.call({ method: 'GET', url: recordings });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      { id: recordingRow().id, status: 'done', started_at: recordingRow().started_at, ended_at: recordingRow().ended_at, url: 'https://signed.example.test/r.mp4' },
    ]);
    expect((await h.call({ method: 'GET', url: recordings, token: 'teacher' })).statusCode).toBe(200);
    expect((await h.call({ method: 'GET', url: recordings, token: 'other' })).statusCode).toBe(403);
    expect((await h.call({ method: 'GET', url: recordings, token: 'assistant' })).statusCode).toBe(403);
  });

  it('POST /livekit/webhook (application/webhook+json, signed): marks the egress done', async () => {
    const body = event('EGRESS_COMPLETE');
    const res = await h.call({
      method: 'POST',
      url: '/livekit/webhook',
      token: null,
      body: body.toString(),
      headers: { 'content-type': 'application/webhook+json', authorization: signedWebhook(body, { now: OPEN }) },
    });
    expect(res.statusCode).toBe(200);
    expect(h.recordings.finishByEgress).toHaveBeenCalledWith('EG_abc', expect.objectContaining({ status: 'done' }));
  });

  it('POST /livekit/webhook: 401 for a bad signature, nothing changes', async () => {
    const body = event('EGRESS_FAILED');
    const res = await h.call({
      method: 'POST',
      url: '/livekit/webhook',
      token: null,
      body: body.toString(),
      headers: { 'content-type': 'application/webhook+json', authorization: signedWebhook(event('EGRESS_COMPLETE'), { now: OPEN }) },
    });
    expect(res.statusCode).toBe(401);
    expect(h.recordings.finishByEgress).not.toHaveBeenCalled();
  });
});
