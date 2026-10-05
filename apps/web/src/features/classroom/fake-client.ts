import { vi } from 'vitest';
import { EMPTY_SNAPSHOT, type DataPacketIn, type MediaFailure, type RoomClient, type RoomSnapshot, type TileView } from './room-types';

// Test data only: a RoomClient whose state the test drives (livekit-client does not run in jsdom).

export const tile = (o: Partial<TileView> & { key: string }): TileView => ({
  name: o.key,
  identity: o.key,
  role: null,
  isBoard: false,
  shareAllowed: false,
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
  /** Delivers a data packet as if another participant sent it. */
  receive: (packet: DataPacketIn) => void;
  sendData: ReturnType<typeof vi.fn<RoomClient['sendData']>>;
  setBoardTrack: ReturnType<typeof vi.fn<RoomClient['setBoardTrack']>>;
  connect: ReturnType<typeof vi.fn<RoomClient['connect']>>;
  disconnect: ReturnType<typeof vi.fn<RoomClient['disconnect']>>;
  setMic: ReturnType<typeof vi.fn<RoomClient['setMic']>>;
  setCamera: ReturnType<typeof vi.fn<RoomClient['setCamera']>>;
  setShare: ReturnType<typeof vi.fn<RoomClient['setShare']>>;
  startAudio: ReturnType<typeof vi.fn<RoomClient['startAudio']>>;
}

export function fakeClient(initial: Partial<RoomSnapshot> = {}, failures: MediaFailure[] = []): FakeClient {
  // Staff by default: may share the screen (a guest's test passes shareAllowed: false).
  let snap: RoomSnapshot = { ...EMPTY_SNAPSHOT, status: 'connected', shareAllowed: true, ...initial };
  const listeners = new Set<(s: RoomSnapshot) => void>();
  const data = new Set<(p: DataPacketIn) => void>();
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
    receive: (packet) => data.forEach((l) => l(packet)),
    sendData: vi.fn<RoomClient['sendData']>(() => Promise.resolve()),
    onData(l) {
      data.add(l);
      return () => void data.delete(l);
    },
    setBoardTrack: vi.fn<RoomClient['setBoardTrack']>((track) => Promise.resolve(client.push({ boardShareOn: track !== null }))),
  };
  return client;
}
