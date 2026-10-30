// Test-only: the few livekit-client members native-client.ts / native-local.ts use, as a fake (no
// WebRTC in Node). `emit` fires a Room event the way LiveKit does.
import type { LiveKitNative } from './livekit-native';

type Handler = (...args: unknown[]) => void;

export function fakeParticipant(identity: string) {
  const pubs = new Map<string, unknown>();
  return {
    identity,
    name: identity,
    isSpeaking: false,
    isMicrophoneEnabled: false,
    isCameraEnabled: false,
    pubs,
    getTrackPublication: (source: string) => pubs.get(source),
    setMicrophoneEnabled: jest.fn((_on: boolean) => Promise.resolve()),
    setCameraEnabled: jest.fn(() => Promise.resolve()),
  };
}

export function fakeLivekit() {
  const handlers = new Map<string, Handler[]>();
  const local = fakeParticipant('me');
  const room = {
    localParticipant: local,
    remoteParticipants: new Map<string, ReturnType<typeof fakeParticipant>>(),
    on(ev: string, h: Handler) {
      handlers.set(ev, [...(handlers.get(ev) ?? []), h]);
      return room;
    },
    connect: jest.fn(() => Promise.resolve()),
    disconnect: jest.fn(() => Promise.resolve()),
  };
  const emit = (ev: string, ...args: unknown[]) => handlers.get(ev)?.forEach((h) => h(...args));
  const RoomEvent = new Proxy({}, { get: (_t, key) => String(key) });
  const lk = {
    Room: jest.fn(() => room),
    RoomEvent,
    Track: { Source: { Camera: 'camera', ScreenShare: 'screen_share' } },
    DisconnectReason: { DUPLICATE_IDENTITY: 2, PARTICIPANT_REMOVED: 4 },
  };
  return { lk: lk as unknown as LiveKitNative['lk'], room, local, emit };
}
