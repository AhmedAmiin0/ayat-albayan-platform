import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLivekitRoom } from './livekit-room';

type Handler = (...a: unknown[]) => void;
const fake = vi.hoisted(() => ({ handlers: new Map<string, Handler>(), connect: vi.fn(), mic: vi.fn(), cam: vi.fn() }));

vi.mock('livekit-client', () => {
  class Room {
    localParticipant = {
      identity: 'me', isLocal: true, isSpeaking: false, isMicrophoneEnabled: false, isCameraEnabled: false,
      isScreenShareEnabled: false, trackPublications: new Map(), setMicrophoneEnabled: fake.mic, setCameraEnabled: fake.cam,
    };
    remoteParticipants = new Map();
    canPlaybackAudio = true;
    connect = fake.connect;
    startAudio = () => Promise.resolve();
    disconnect = vi.fn();
    on(ev: string, h: Handler) {
      fake.handlers.set(ev, h);
      return this;
    }
  }
  const RoomEvent = new Proxy({}, { get: (_t, k) => String(k) });
  return { Room, RoomEvent, DisconnectReason: { DUPLICATE_IDENTITY: 'dup', CLIENT_INITIATED: 'client' }, Track: { Source: {} } };
});

describe('createLivekitRoom', () => {
  beforeEach(() => {
    fake.handlers.clear();
    fake.connect.mockResolvedValue(undefined);
    fake.mic.mockResolvedValue(undefined);
    fake.cam.mockResolvedValue(undefined);
  });

  it('connects, starts mic then camera, and reports the ones that failed', async () => {
    const denied = new Error('no');
    fake.mic.mockRejectedValue(denied);
    const c = createLivekitRoom();
    const failures = await c.connect('wss://x', 'tok');
    expect(fake.connect).toHaveBeenCalledWith('wss://x', 'tok');
    expect(failures).toEqual([{ device: 'mic', error: denied }]);
    expect(c.snapshot().status).toBe('connected');
  });

  it('maps DUPLICATE_IDENTITY to its own status, any other disconnect to ended', () => {
    const c = createLivekitRoom();
    fake.handlers.get('Disconnected')?.('dup');
    expect(c.snapshot().status).toBe('duplicate');
    fake.handlers.get('Disconnected')?.('client');
    expect(c.snapshot().status).toBe('ended');
  });

  it('goes reconnecting and back', () => {
    const c = createLivekitRoom();
    const seen: string[] = [];
    c.subscribe((s) => seen.push(s.status));
    fake.handlers.get('Reconnecting')?.();
    fake.handlers.get('Reconnected')?.();
    expect(seen).toEqual(['reconnecting', 'connected']);
  });
});
