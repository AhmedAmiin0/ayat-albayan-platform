import { describe, expect, it } from 'vitest';
import { CONFIG, decode } from '../classroom.fakes';
import { LivekitApi, LivekitError, twirpBase } from './livekit-api';
import { http } from '../moderation/moderation.fakes';

const api = (h = http(), config: typeof CONFIG | null = CONFIG) => new LivekitApi(config, h);
const sent = (h: ReturnType<typeof http>, i = 0) => {
  const [url, init] = h.mock.calls[i] ?? ['', { method: 'POST' as const, headers: {} as Record<string, string>, body: '{}' }];
  const auth = init.headers.authorization ?? '';
  return { url, body: JSON.parse(init.body) as unknown, claims: decode(auth.replace('Bearer ', '')), init };
};

describe('twirpBase', () => {
  it('turns the signalling URL into the HTTP base', () => {
    expect(twirpBase('wss://lk.example.test')).toBe('https://lk.example.test');
    expect(twirpBase('ws://localhost:7880/')).toBe('http://localhost:7880');
    expect(twirpBase('https://lk.example.test')).toBe('https://lk.example.test');
  });
});

describe('LivekitApi.removeParticipant', () => {
  it('POSTs {room, identity} to RoomService/RemoveParticipant with a roomAdmin token for that room', async () => {
    const h = http();
    await api(h).removeParticipant({ room: 'lesson-1', identity: 'guest-0123456789ab' });
    const s = sent(h);
    expect(s.url).toBe('https://livekit.example.test/twirp/livekit.RoomService/RemoveParticipant');
    expect(s.body).toEqual({ room: 'lesson-1', identity: 'guest-0123456789ab' });
    expect(s.init.headers['content-type']).toBe('application/json');
    expect(s.claims.validSignature).toBe(true);
    expect(s.claims.video).toEqual({ roomAdmin: true, room: 'lesson-1' });
  });

  it('a participant already gone (not_found) counts as removed', async () => {
    await expect(api(http({ status: 404, body: { code: 'not_found', msg: 'participant not found' } })).removeParticipant({ room: 'r', identity: 'i' })).resolves.toBeUndefined();
  });

  it('any other refusal throws a LivekitError with the Twirp code', async () => {
    const err = await api(http({ status: 401, body: { code: 'unauthenticated' } })).removeParticipant({ room: 'r', identity: 'i' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LivekitError);
    expect(err).toMatchObject({ status: 401, code: 'unauthenticated' });
  });
});

describe('LivekitApi.call', () => {
  it('returns the JSON answer', async () => {
    const h = http({ body: { egress_id: 'EG_1' } });
    expect(await api(h).call({ method: 'livekit.Egress/StartRoomCompositeEgress', body: {}, grant: { roomRecord: true } })).toEqual({ egress_id: 'EG_1' });
  });

  it('a non-JSON error body still throws (code unknown)', async () => {
    const h = http({ status: 502 });
    h.mockResolvedValueOnce({ ok: false, status: 502, text: async () => '<html>' });
    await expect(api(h).call({ method: 'x', body: {}, grant: {} })).rejects.toMatchObject({ status: 502, code: 'unknown' });
  });

  it('not configured: throws without any request', async () => {
    const h = http();
    const a = api(h, null);
    expect(a.configured).toBe(false);
    await expect(a.call({ method: 'x', body: {}, grant: {} })).rejects.toMatchObject({ code: 'not_configured' });
    expect(h).not.toHaveBeenCalled();
  });
});

describe('LivekitApi.createRoom', () => {
  it('creates the lesson room with a roomCreate token and a 10-minute empty timeout', async () => {
    const h = http();
    await api(h).createRoom('lesson-1');
    const s = sent(h);
    expect(s.url).toMatch(/\/twirp\/livekit\.RoomService\/CreateRoom$/);
    expect(s.body).toEqual({ name: 'lesson-1', empty_timeout: 600 });
    expect(s.claims.video).toEqual({ roomCreate: true });
  });
});
