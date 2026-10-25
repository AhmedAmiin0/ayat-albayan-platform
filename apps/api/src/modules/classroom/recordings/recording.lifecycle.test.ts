import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG, LESSON_ID } from '../classroom.fakes';
import { LivekitApi, type HttpPost } from '../livekit/livekit-api';
import { leftEventOf, peopleIn } from '../livekit/livekit-webhook.room';
import { recordingQueries } from '../moderation/moderation.fakes';
import { RecordingLifecycle } from './recording.lifecycle';
import type { RecordingQueries } from './recording.queries';
import type { RecordingStarter } from './recording.starter';

const ROOM = `lesson-${LESSON_ID}`;
const EGRESS = { identity: 'EG_x', kind: 'EGRESS' };
let people: object[];
let rq: ReturnType<typeof recordingQueries>;
let starter: { startFor: ReturnType<typeof vi.fn>; configured: boolean };
const http = vi.fn<HttpPost>(async (url) => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(url.endsWith('/ListParticipants') ? { participants: people } : {}),
}));
const life = () => new RecordingLifecycle(new LivekitApi(CONFIG, http), rq as unknown as RecordingQueries, starter as unknown as RecordingStarter);
const methods = () => http.mock.calls.map(([url]) => url.split('/twirp/')[1]);

beforeEach(() => {
  http.mockClear();
  rq = recordingQueries();
  starter = { startFor: vi.fn().mockResolvedValue('started'), configured: true };
  people = [EGRESS, { identity: 'teacher-0123456789ab', kind: 'STANDARD' }];
});

describe('RecordingLifecycle', () => {
  it('an egress that ended while people remain is started again (the claim keeps it to one)', async () => {
    expect(await life().afterEgressEnded({ room: ROOM, status: 'done' })).toBe('restarted');
    expect(starter.startFor).toHaveBeenCalledWith({ kind: 'lesson', id: LESSON_ID });
  });

  it('a failed egress is not retried (no restart loop)', async () => {
    expect(await life().afterEgressEnded({ room: ROOM, status: 'failed' })).toBe('idle');
    expect(starter.startFor).not.toHaveBeenCalled();
  });

  it('…but not in an empty room, an unknown room, or without recording set up', async () => {
    people = [EGRESS];
    expect(await life().afterEgressEnded({ room: ROOM, status: 'done' })).toBe('idle');
    expect(await life().afterEgressEnded({ room: 'somewhere', status: 'done' })).toBe('idle');
    expect(await life().afterEgressEnded({ room: null, status: 'done' })).toBe('idle');
    starter.configured = false;
    people = [{ identity: 'guest-0123456789ab' }];
    expect(await life().afterEgressEnded({ room: ROOM, status: 'done' })).toBe('idle');
    expect(starter.startFor).not.toHaveBeenCalled();
  });

  it('the last person leaving stops the running egress', async () => {
    people = [EGRESS, { identity: 'guest-0123456789ab' }];
    expect(await life().afterLeft({ room: `meeting-${LESSON_ID}`, identity: 'guest-0123456789ab' })).toBe('stopped');
    expect(rq.runningEgress).toHaveBeenCalledWith({ kind: 'meeting', id: LESSON_ID });
    expect(methods()).toEqual(['livekit.RoomService/ListParticipants', 'livekit.Egress/StopEgress']);
    expect(JSON.parse(http.mock.calls[1]?.[1].body ?? '{}')).toEqual({ egress_id: 'EG_abc' });
  });

  it('someone still there, or nothing running: no stop; a LiveKit failure is swallowed', async () => {
    expect(await life().afterLeft({ room: ROOM, identity: 'guest-0123456789ab' })).toBe('idle');
    people = [];
    rq.runningEgress.mockResolvedValueOnce(null);
    expect(await life().afterLeft({ room: ROOM, identity: 'x' })).toBe('idle');
    http.mockRejectedValueOnce(new Error('down'));
    expect(await life().afterLeft({ room: ROOM, identity: 'x' })).toBe('idle');
    expect(methods()).not.toContain('livekit.Egress/StopEgress');
  });
});

describe('webhook room helpers', () => {
  it('participant_left with a room; people without recorders', () => {
    expect(leftEventOf({ event: 'participant_left', room: { name: 'r' }, participant: { identity: 'g' } })).toEqual({ room: 'r', identity: 'g' });
    expect(leftEventOf({ event: 'participant_left', room: {} })).toBeNull();
    expect(leftEventOf({ event: 'room_started', room: { name: 'r' } })).toBeNull();
    expect(peopleIn({ participants: [EGRESS, { identity: 'a', kind: 2 }, { identity: 'b' }, { identity: 'c' }, 'junk'] }, 'c')).toEqual(['b']);
    expect(peopleIn({})).toEqual([]);
  });
});
