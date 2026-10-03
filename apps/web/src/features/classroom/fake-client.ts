import { vi } from 'vitest';
import { EMPTY_SNAPSHOT, type MediaFailure, type RoomClient, type RoomSnapshot, type TileView } from './room-types';

// Test data only: a RoomClient whose state the test drives (livekit-client does not run in jsdom).

export const tile = (o: Partial<TileView> & { key: string }): TileView => ({
  name: o.key,
  isLocal: false,
  kind: 'camera',
  speaking: false,
  micOn: true,
  hasVideo: false,
  videoRev: '',
  ...o,
});

export interface FakeClient extends RoomClient {
  push: (patch: Partial<RoomSnapshot>) => void;
  connect: ReturnType<typeof vi.fn<RoomClient['connect']>>;
  disconnect: ReturnType<typeof vi.fn<RoomClient['disconnect']>>;
  setMic: ReturnType<typeof vi.fn<RoomClient['setMic']>>;
  setCamera: ReturnType<typeof vi.fn<RoomClient['setCamera']>>;
  setShare: ReturnType<typeof vi.fn<RoomClient['setShare']>>;
  startAudio: ReturnType<typeof vi.fn<RoomClient['startAudio']>>;
}

export function fakeClient(initial: Partial<RoomSnapshot> = {}, failures: MediaFailure[] = []): FakeClient {
  let snap: RoomSnapshot = { ...EMPTY_SNAPSHOT, status: 'connected', ...initial };
  const listeners = new Set<(s: RoomSnapshot) => void>();
  const client: FakeClient = {
    push(patch) {
      snap = { ...snap, ...patch };
      listeners.forEach((l) => l(snap));
    },
    connect: vi.fn<RoomClient['connect']>(() => Promise.resolve(failures)),
    disconnect: vi.fn<RoomClient['disconnect']>(() => client.push({ status: 'ended' })),
    snapshot: () => snap,
    subscribe(l) {
      listeners.add(l);
      l(snap);
      return () => void listeners.delete(l);
    },
    setMic: vi.fn<RoomClient['setMic']>((on) => Promise.resolve(client.push({ micOn: on }))),
    setCamera: vi.fn<RoomClient['setCamera']>((on) => Promise.resolve(client.push({ camOn: on }))),
    setShare: vi.fn<RoomClient['setShare']>((on) => Promise.resolve(client.push({ shareOn: on }))),
    startAudio: vi.fn<RoomClient['startAudio']>(() => Promise.resolve(client.push({ canPlayAudio: true }))),
    attachVideo: () => () => undefined,
  };
  return client;
}
