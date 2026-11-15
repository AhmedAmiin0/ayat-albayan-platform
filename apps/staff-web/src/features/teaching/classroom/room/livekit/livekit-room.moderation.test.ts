import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLivekitRoom } from './livekit-room';

type Handler = (...a: unknown[]) => void;
const fake = vi.hoisted(() => ({
  handlers: new Map<string, Handler>(),
  room: { isRecording: false },
  share: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
}));

vi.mock('livekit-client', () => {
  class Room {
    localParticipant = {
      identity: 'me', isLocal: true, isSpeaking: false, isMicrophoneEnabled: false, isCameraEnabled: false,
      isScreenShareEnabled: false, trackPublications: new Map(), setScreenShareEnabled: fake.share,
      publishTrack: fake.publish, unpublishTrack: fake.unpublish,
    };
    remoteParticipants = new Map();
    canPlaybackAudio = true;
    get isRecording() {
      return fake.room.isRecording;
    }
    on(ev: string, h: Handler) {
      fake.handlers.set(ev, h);
      return this;
    }
  }
  const RoomEvent = new Proxy({}, { get: (_t, k) => String(k) });
  return { Room, RoomEvent, DisconnectReason: { PARTICIPANT_REMOVED: 'removed', DUPLICATE_IDENTITY: 'dup' }, Track: { Source: { ScreenShare: 'screen_share' } } };
});

describe('createLivekitRoom: moderation and board', () => {
  beforeEach(() => {
    fake.handlers.clear();
    fake.room.isRecording = false;
    for (const f of [fake.share, fake.publish, fake.unpublish]) f.mockResolvedValue(undefined);
  });

  it('being removed (PARTICIPANT_REMOVED) gets its own status', () => {
    const c = createLivekitRoom();
    fake.handlers.get('Disconnected')?.('removed');
    expect(c.snapshot().status).toBe('removed');
  });

  it('a recording change refreshes the snapshot', () => {
    const c = createLivekitRoom();
    fake.room.isRecording = true;
    fake.handlers.get('RecordingStatusChanged')?.(true);
    expect(c.snapshot().isRecording).toBe(true);
  });

  it('publishes and stops the board track', async () => {
    const c = createLivekitRoom();
    const track = { id: 'b' } as unknown as MediaStreamTrack;
    await c.setBoardTrack(track);
    expect(fake.publish).toHaveBeenCalledWith(track, { source: 'screen_share', name: 'board' });
    await c.setBoardTrack(null);
    expect(fake.unpublish).toHaveBeenCalledWith(track, true);
  });
});
