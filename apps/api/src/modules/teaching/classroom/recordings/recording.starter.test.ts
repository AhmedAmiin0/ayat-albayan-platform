import { beforeEach, describe, expect, it } from 'vitest';
import type { RecordingConfig } from '@/modules/teaching/classroom/classroom.config';
import { CONFIG, LESSON_ID, OPEN } from '@/modules/teaching/classroom/classroom.fakes';
import { LivekitApi } from '@/modules/teaching/classroom/livekit/livekit-api';
import { http, recordingQueries, S3 } from '@/modules/teaching/classroom/moderation/moderation.fakes';
import type { RecordingRepo } from './recording.repo';
import { RecordingStarter } from './recording.starter';
import { lessonTarget, meetingTarget } from './recording-target';

let q: ReturnType<typeof recordingQueries>;
let h: ReturnType<typeof http>;
const starter = (opts: { s3?: RecordingConfig; livekit?: typeof CONFIG | null } = {}) =>
  new RecordingStarter(
    q as unknown as RecordingRepo,
    new LivekitApi(opts.livekit === undefined ? CONFIG : opts.livekit, h),
    opts.s3 === undefined ? S3 : opts.s3,
  );
const path = `lessons/${LESSON_ID}/2026-10-05T16-05-00-000Z.mp3`;

beforeEach(() => {
  q = recordingQueries();
  h = http({ body: { egress_id: 'EG_new' } });
});

describe('starting a lesson recording', () => {
  it('claims the row, creates the room, then starts an audio-only MP3 egress into the bucket path', async () => {
    expect(await starter().startFor(lessonTarget(LESSON_ID), OPEN)).toBe('started');
    expect(q.claim).toHaveBeenCalledWith({ target: lessonTarget(LESSON_ID), filePath: path, startedAt: OPEN.toISOString() });
    const urls = h.mock.calls.map(([url]) => url);
    expect(urls).toEqual([
      'https://livekit.example.test/twirp/livekit.RoomService/CreateRoom',
      'https://livekit.example.test/twirp/livekit.Egress/StartRoomCompositeEgress',
    ]);
    const body = JSON.parse(h.mock.calls[1]?.[1].body ?? '{}');
    expect(body).toMatchObject({ room_name: `lesson-${LESSON_ID}`, audio_only: true, file_outputs: [{ file_type: 'MP3', filepath: path }] });
    expect(q.attachEgress).toHaveBeenCalledWith('00000000-0000-4000-8000-0000000000aa', 'EG_new');
  });

  it('an internal meeting records the same way, into meetings/<id>/', async () => {
    expect(await starter().startFor(meetingTarget(LESSON_ID), OPEN)).toBe('started');
    const body = JSON.parse(h.mock.calls[1]?.[1].body ?? '{}');
    expect(body).toMatchObject({ room_name: `meeting-${LESSON_ID}`, file_outputs: [{ filepath: `meetings/${LESSON_ID}/2026-10-05T16-05-00-000Z.mp3` }] });
    expect(starter().configured).toBe(true);
    expect(starter({ s3: null }).configured).toBe(false);
  });

  it('is idempotent: a running recording (claim refused) starts nothing', async () => {
    q.claim.mockResolvedValue(null);
    expect(await starter().startFor(lessonTarget(LESSON_ID), OPEN)).toBe('running');
    expect(h).not.toHaveBeenCalled();
  });

  it('off without RECORDING_S3_* or without LiveKit: no row, no call', async () => {
    expect(await starter({ s3: null }).startFor(lessonTarget(LESSON_ID), OPEN)).toBe('off');
    expect(await starter({ livekit: null }).startFor(lessonTarget(LESSON_ID), OPEN)).toBe('off');
    expect(q.claim).not.toHaveBeenCalled();
    expect(h).not.toHaveBeenCalled();
  });

  it('LiveKit refusing marks the claim failed with the reason (never throws)', async () => {
    h.mockResolvedValueOnce({ ok: true, status: 200, text: async () => '{}' });
    h.mockResolvedValueOnce({ ok: false, status: 503, text: async () => JSON.stringify({ code: 'unavailable' }) });
    expect(await starter().startFor(lessonTarget(LESSON_ID), OPEN)).toBe('failed');
    expect(q.finish).toHaveBeenCalledWith('00000000-0000-4000-8000-0000000000aa', expect.objectContaining({ status: 'failed', error: 'livekit 503 unavailable' }));
    expect(q.attachEgress).not.toHaveBeenCalled();
  });

  it('an answer without an egress id is a failure too', async () => {
    h = http({ body: {} });
    expect(await starter().startFor(lessonTarget(LESSON_ID), OPEN)).toBe('failed');
    expect(q.finish).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ error: 'no egress id in the answer' }));
  });

  it('a failing claim (database) is reported, not thrown', async () => {
    q.claim.mockRejectedValue(new Error('db down'));
    expect(await starter().startFor(lessonTarget(LESSON_ID), OPEN)).toBe('failed');
    expect(h).not.toHaveBeenCalled();
  });
});
