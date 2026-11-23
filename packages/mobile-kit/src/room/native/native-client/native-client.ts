import type { RoomClient } from '../../model/room-types';
import type { LiveKitNative } from '../livekit-native';
import { localControls } from '../native-local';
import { roomStore } from '../native-store';

/**
 * The real client: one livekit-client Room behind RoomClient (the web's livekit-room.ts, for the
 * phone).
 */
export function createNativeClient({ lk }: LiveKitNative): RoomClient {
  const room = new lk.Room({ adaptiveStream: true, dynacast: true });
  const store = roomStore(lk, room);
  const local = localControls({ lk }, room, store.emit);
  // Left before the join finished (back, sign-out while the token or audio was awaited): a
  // connect never starts, or is undone, so no room keeps the mic and camera behind a closed screen.
  let closed = false;
  const ensureOpen = () => {
    if (closed) throw new Error('room client closed');
  };
  // A disconnect while joining (the network, DeleteRoom) fails the join: never live on a dead room.
  const ensureAlive = () => {
    if (store.closed()) throw new Error('room dropped while joining');
  };
  return {
    async connect(join, media) {
      ensureOpen();
      store.reset();
      await room.connect(join.url, join.token);
      if (closed) void room.disconnect();
      ensureOpen();
      await local.start(media);
      ensureAlive();
      store.setStatus('connected');
    },
    disconnect: () => void room.disconnect(),
    close: () => {
      closed = true;
      void room.disconnect();
    },
    snapshot: store.snapshot,
    subscribe: store.subscribe,
    setMic: local.setMic,
    setCamera: local.setCamera,
    switchCamera: local.switchCamera,
  };
}
