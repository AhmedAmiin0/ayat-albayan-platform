import type { Participant, Room, Track } from 'livekit-client';
import { snapshotOf, type RoomLike, type SourceName } from '@/classroom/room/model/room-snapshot';
import {
  EMPTY_SNAPSHOT,
  type RoomClient,
  type RoomStatus,
} from '@/classroom/room/model/room-types';
import type { LiveKitNative } from './livekit-native';
import { localControls } from './native-local';

type Lk = LiveKitNative['lk'];

function roomLike(lk: Lk, room: Room): RoomLike<Participant> {
  const source = (s: SourceName): Track.Source =>
    s === 'camera' ? lk.Track.Source.Camera : lk.Track.Source.ScreenShare;
  return {
    local: room.localParticipant,
    remotes: [...room.remoteParticipants.values()],
    publication: (p, s) => p.getTrackPublication(source(s)),
    videoRef: (p, s) => ({
      participant: p,
      publication: p.getTrackPublication(source(s)),
      source: source(s),
    }),
  };
}

/** Kicked and opened elsewhere get their own screens; any other disconnect is «ended». */
function closing(lk: Lk, reason: number | undefined): RoomStatus {
  if (reason === lk.DisconnectReason.DUPLICATE_IDENTITY) return 'duplicate';
  return reason === lk.DisconnectReason.PARTICIPANT_REMOVED ? 'removed' : 'ended';
}

/** The events that change what the grid shows. */
const refresh = (E: Lk['RoomEvent']) => [
  E.TrackSubscribed,
  E.TrackUnsubscribed,
  E.LocalTrackPublished,
  E.LocalTrackUnpublished,
  E.TrackMuted,
  E.TrackUnmuted,
  E.ParticipantConnected,
  E.ParticipantDisconnected,
  E.ParticipantNameChanged,
  E.ActiveSpeakersChanged,
];

/** The room's state and its listeners: emit() rebuilds the snapshot from the Room. */
function roomStore(lk: Lk, room: Room) {
  const listeners = new Set<() => void>();
  let status: RoomStatus = 'connecting';
  let last = EMPTY_SNAPSHOT;
  const emit = () => {
    last = snapshotOf(roomLike(lk, room), status);
    listeners.forEach((l) => l());
  };
  const setStatus = (next: RoomStatus) => {
    status = next;
    emit();
  };
  refresh(lk.RoomEvent).forEach((ev) => room.on(ev, emit));
  room
    .on(lk.RoomEvent.Reconnecting, () => setStatus('reconnecting'))
    .on(lk.RoomEvent.Reconnected, () => setStatus('connected'))
    .on(lk.RoomEvent.Disconnected, (reason) => setStatus(closing(lk, reason)));
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  };
  return { emit, setStatus, subscribe, snapshot: () => last };
}

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
  return {
    async connect(join, media) {
      ensureOpen();
      await room.connect(join.url, join.token);
      if (closed) void room.disconnect();
      ensureOpen();
      await local.start(media);
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
